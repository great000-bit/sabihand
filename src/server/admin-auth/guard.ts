import { cache } from "react";
import { cookies, headers } from "next/headers";
import { dbConfigured, sql } from "../db";
import { newToken, sha256 } from "./crypto";

/**
 * Admin sessions. Separate from the Google session on purpose: the admin area opens only after an email + password
 * (+ 2FA code when switched on) sign-in here, so a stolen or shared Google login never reaches it.
 *
 * Cookie: random 256-bit value, `__Host-` prefix (Secure, Path=/, no Domain, so no subdomain can set or read it),
 * HttpOnly (no script can read it), SameSite=Strict (never sent from another site, which stops CSRF). Only its SHA-256
 * is stored, so a database leak gives no usable session. Sessions end after 30 idle minutes or 8 hours at most.
 */
export const ADMIN_COOKIE = process.env.NODE_ENV === "production" ? "__Host-sbh_admin" : "sbh_admin";
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export const IDLE_MS = 30 * 60 * 1000;

export async function clientInfo() {
  const h = await headers();
  // Vercel sets x-vercel-forwarded-for itself and strips copies sent by the client.
  const ip = (h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || "unknown";
  const ua = (h.get("user-agent") ?? "").slice(0, 300);
  return { ip, ua };
}

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  mustChange: boolean;
  totp: boolean;
  tokenHash: string;
}

/** The admin signed in on this browser, or null. Checked fresh on every request (cached per request only). */
export const readAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!dbConfigured) return null;
  const jar = await cookies();
  const raw = jar.get(ADMIN_COOKIE)?.value;
  if (!raw || raw.length > 100) return null;
  const tokenHash = sha256(raw);
  try {
    const rows = (await sql()`
      update app.admin_sessions s set last_seen_at = now()
      from app.admin_credentials c
      where s.token_hash = ${tokenHash} and c.user_id = s.user_id
        and s.expires_at > now() and s.last_seen_at > now() - make_interval(secs => ${IDLE_MS / 1000})
      returning s.user_id, c.email, c.must_change, (c.totp_secret is not null) as totp,
        coalesce((select name from neon_auth."user" u where u.id::text = s.user_id), c.email) as name`) as { user_id: string; email: string; must_change: boolean; totp: boolean; name: string }[];
    const r = rows[0];
    if (!r) return null;
    return { userId: r.user_id, email: r.email, name: r.name, mustChange: r.must_change, totp: r.totp, tokenHash };
  } catch (e) {
    console.error("admin session check failed", e);
    return null;
  }
});

export async function startAdminSession(userId: string) {
  const token = newToken();
  const { ip, ua } = await clientInfo();
  const db = sql();
  // Housekeeping: drop this admin's dead sessions.
  await db`delete from app.admin_sessions where user_id = ${userId} and (expires_at < now() or last_seen_at < now() - make_interval(secs => ${IDLE_MS / 1000}))`;
  await db`insert into app.admin_sessions (token_hash, user_id, expires_at, ip, user_agent) values (${sha256(token)}, ${userId}, ${new Date(Date.now() + ABSOLUTE_MS).toISOString()}, ${ip}, ${ua})`;
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ABSOLUTE_MS / 1000,
    priority: "high",
  });
}

export async function endAdminSession() {
  const jar = await cookies();
  const raw = jar.get(ADMIN_COOKIE)?.value;
  if (raw) await sql()`delete from app.admin_sessions where token_hash = ${sha256(raw)}`.catch(() => {});
  jar.delete({ name: ADMIN_COOKIE, path: "/", secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "strict" });
}

/* ---------------------------------------------------------------- lockout */

/**
 * Brute-force protection. Failures are counted per account and per network address over 15 minutes.
 * 5 wrong tries on one account locks it for 15 minutes; each later lock doubles, up to 24 hours.
 * 20 wrong tries from one address locks that address for an hour (stops spraying many accounts).
 * A lock holds even when the right password is then typed, and the answer never says which part was wrong.
 */
export const ACCOUNT_LIMIT = 5;
export const IP_LIMIT = 20;
const WINDOW_S = 15 * 60;

export async function lockedUntil(email: string, ip: string): Promise<Date | null> {
  const rows = (await sql()`select max(until) as until from app.auth_locks where until > now() and ((scope = 'email' and key = ${email}) or (scope = 'ip' and key = ${ip}))`) as { until: string | null }[];
  return rows[0]?.until ? new Date(rows[0].until) : null;
}

/** Records a failure; returns true when this failure just locked the account or address. */
export async function recordFailure(email: string, ip: string): Promise<boolean> {
  const db = sql();
  await db`insert into app.auth_failures (scope, key) values ('email', ${email}), ('ip', ${ip})`;
  await db`delete from app.auth_failures where at < now() - interval '1 day'`;
  const [c] = (await db`select
      count(*) filter (where scope = 'email' and key = ${email}) as e,
      count(*) filter (where scope = 'ip' and key = ${ip}) as i
    from app.auth_failures where at > now() - make_interval(secs => ${WINDOW_S})`) as { e: string; i: string }[];
  let locked = false;
  if (Number(c.e) >= ACCOUNT_LIMIT) {
    // 15 min, 30, 60 ... capped at 24 h. Strikes are remembered for a day.
    await db`insert into app.auth_locks (scope, key, until, strikes) values ('email', ${email}, now() + interval '15 minutes', 1)
      on conflict (scope, key) do update set
        strikes = case when app.auth_locks.until > now() - interval '1 day' then app.auth_locks.strikes + 1 else 1 end,
        until = now() + least(interval '24 hours', interval '15 minutes' * power(2, case when app.auth_locks.until > now() - interval '1 day' then app.auth_locks.strikes else 0 end))`;
    await db`delete from app.auth_failures where scope = 'email' and key = ${email}`;
    locked = true;
  }
  if (Number(c.i) >= IP_LIMIT) {
    await db`insert into app.auth_locks (scope, key, until) values ('ip', ${ip}, now() + interval '1 hour') on conflict (scope, key) do update set until = now() + interval '1 hour', strikes = app.auth_locks.strikes + 1`;
    await db`delete from app.auth_failures where scope = 'ip' and key = ${ip}`;
    locked = true;
  }
  return locked;
}

export async function clearFailures(email: string) {
  await sql()`delete from app.auth_failures where scope = 'email' and key = ${email}`;
}

/* ---------------------------------------------------------------- audit */

/** Writes one line to the admin audit trail. Never throws: a failed log must not block the action. */
export async function audit(action: string, who: { userId?: string | null; email?: string | null }, detail: Record<string, unknown> = {}) {
  if (!dbConfigured) return;
  try {
    const { ip, ua } = await clientInfo();
    await sql()`insert into app.admin_audit (user_id, email, action, ip, user_agent, detail) values (${who.userId ?? null}, ${who.email ?? null}, ${action}, ${ip}, ${ua}, ${JSON.stringify(detail)}::jsonb)`;
  } catch (e) {
    console.error("audit write failed", action, e);
  }
}
