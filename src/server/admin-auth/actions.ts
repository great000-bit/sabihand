"use server";

import { randomInt } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { sql } from "../db";
import { emailAdmins } from "../email";
import { adminRolesFor } from "../session";
import { passwordProblem } from "@/lib/password-policy";
import { checkTotp, dummyHash, hashPassword, newTotpSecret, verifyPassword } from "./crypto";
import { audit, clearFailures, clientInfo, endAdminSession, lockedUntil, readAdminSession, recordFailure, startAdminSession } from "./guard";

/*
 * Every action here is a Next.js Server Action: Next only runs it for a POST from this site's own pages (it checks the
 * Origin header against the host), and the admin cookie is SameSite=Strict, so another site cannot trigger them.
 * Each one re-checks the session on the server; nothing trusts what the browser says about who it is.
 */

const WRONG = "Email or password is incorrect.";
const LOCKED = "Too many attempts. Sign-in is paused for a while. Try again later.";
const UNAVAILABLE = "Sign-in is not available right now. Try again in a moment.";

export type SignInResult = { ok: boolean; error?: string; needCode?: boolean };

type Cred = { user_id: string; email: string; password_hash: string; totp_secret: string | null; totp_last_step: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function adminSignIn(input: { email: string; password: string; code?: string }): Promise<SignInResult> {
  const email = str(input?.email, 200).trim().toLowerCase();
  const password = str(input?.password, 256);
  const code = str(input?.code, 12).replace(/\s/g, "");
  const { ip } = await clientInfo();
  try {
    if (await lockedUntil(email, ip)) {
      await audit("sign_in_blocked", { email }, { reason: "locked" });
      return { ok: false, error: LOCKED };
    }
    const rows = (await sql()`select user_id, email, password_hash, totp_secret, totp_last_step from app.admin_credentials where email = ${email} limit 1`) as Cred[];
    const c = rows[0];
    // Same work whether or not the email exists, so timing does not reveal which addresses are admins.
    const good = await verifyPassword(password, c?.password_hash ?? (await dummyHash()));
    const roles = c && good ? await adminRolesFor(c.user_id, c.email, true) : null;
    if (!c || !good || !roles?.isAdmin) {
      const locked = await recordFailure(email, ip);
      await audit("sign_in_failed", { userId: c?.user_id, email }, { locked });
      if (locked && c) after(() => emailAdmins({ subject: "Admin sign-in locked after failed attempts", lines: [`Repeated wrong passwords were entered for ${c.email} from ${ip}. Sign-in for that account is paused.`, "If this was not you, change your password as soon as the pause ends."], path: "/admin/security", cta: "Open security" }));
      return { ok: false, error: locked ? LOCKED : WRONG };
    }
    if (c.totp_secret) {
      if (!code) return { ok: false, needCode: true };
      const step = checkTotp(c.totp_secret, code, Number(c.totp_last_step));
      // Claim the step atomically so the same code cannot be used twice, even by two requests at once.
      const claimed = step !== null && ((await sql()`update app.admin_credentials set totp_last_step = ${step} where user_id = ${c.user_id} and totp_last_step < ${step} returning 1`) as unknown[]).length > 0;
      if (!claimed) {
        const locked = await recordFailure(email, ip);
        await audit("sign_in_failed", { userId: c.user_id, email }, { reason: "code", locked });
        return { ok: false, needCode: true, error: locked ? LOCKED : "That code is not right. Use the newest code in your authenticator app." };
      }
    }
    await clearFailures(email);
    await startAdminSession(c.user_id);
    await audit("sign_in", { userId: c.user_id, email }, { totp: Boolean(c.totp_secret) });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    console.error("admin sign-in failed", e);
    return { ok: false, error: UNAVAILABLE };
  }
}

export async function adminSignOut(): Promise<void> {
  const s = await readAdminSession();
  await endAdminSession();
  if (s) await audit("sign_out", s);
  revalidatePath("/", "layout");
}

/** Change your own admin password. Needs the current one; ends every other session of this account. */
export async function changeAdminPassword(input: { current: string; next: string }): Promise<{ error: string | null }> {
  const s = await readAdminSession();
  if (!s) return { error: "Your admin session has ended. Sign in again." };
  const current = str(input?.current, 256);
  const next = str(input?.next, 256);
  const problem = passwordProblem(next, s.email);
  if (problem) return { error: problem };
  const { ip } = await clientInfo();
  if (await lockedUntil(s.email, ip)) return { error: LOCKED };
  const [c] = (await sql()`select password_hash from app.admin_credentials where user_id = ${s.userId}`) as { password_hash: string }[];
  if (!c || !(await verifyPassword(current, c.password_hash))) {
    await recordFailure(s.email, ip);
    await audit("password_change_failed", s);
    return { error: "Your current password is not right." };
  }
  if (await verifyPassword(next, c.password_hash)) return { error: "Choose a password you have not used here before." };
  const hash = await hashPassword(next);
  await sql()`update app.admin_credentials set password_hash = ${hash}, must_change = false, password_changed_at = now() where user_id = ${s.userId}`;
  await sql()`delete from app.admin_sessions where user_id = ${s.userId} and token_hash <> ${s.tokenHash}`;
  await audit("password_changed", s);
  revalidatePath("/", "layout");
  return { error: null };
}

/* ---------------------------------------------------------------- 2FA */

async function fullAdmin() {
  const s = await readAdminSession();
  if (!s || s.mustChange) return null;
  return (await adminRolesFor(s.userId, s.email, true)).isAdmin ? s : null;
}

/** Starts 2FA set-up: a new secret to add to an authenticator app. Not active until a code from it is confirmed. */
export async function startTotpSetup(): Promise<{ error: string | null; secret?: string; uri?: string }> {
  const s = await fullAdmin();
  if (!s) return { error: "Sign in to the admin area first." };
  const secret = newTotpSecret();
  await sql()`update app.admin_credentials set totp_pending = ${secret} where user_id = ${s.userId}`;
  const label = encodeURIComponent(`Sabihand Admin:${s.email}`);
  return { error: null, secret, uri: `otpauth://totp/${label}?secret=${secret}&issuer=Sabihand%20Admin&algorithm=SHA1&digits=6&period=30` };
}

export async function confirmTotp(code: string): Promise<{ error: string | null }> {
  const s = await fullAdmin();
  if (!s) return { error: "Sign in to the admin area first." };
  const [c] = (await sql()`select totp_pending from app.admin_credentials where user_id = ${s.userId}`) as { totp_pending: string | null }[];
  if (!c?.totp_pending) return { error: "Start the set-up again." };
  const step = checkTotp(c.totp_pending, str(code, 12).replace(/\s/g, ""), 0);
  if (step === null) return { error: "That code is not right. Check the time on your phone and try the newest code." };
  await sql()`update app.admin_credentials set totp_secret = totp_pending, totp_pending = null, totp_last_step = ${step} where user_id = ${s.userId}`;
  await audit("totp_enabled", s);
  revalidatePath("/admin/security");
  return { error: null };
}

export async function disableTotp(password: string): Promise<{ error: string | null }> {
  const s = await fullAdmin();
  if (!s) return { error: "Sign in to the admin area first." };
  const [c] = (await sql()`select password_hash from app.admin_credentials where user_id = ${s.userId}`) as { password_hash: string }[];
  if (!c || !(await verifyPassword(str(password, 256), c.password_hash))) {
    await audit("totp_disable_failed", s);
    return { error: "Your password is not right." };
  }
  await sql()`update app.admin_credentials set totp_secret = null, totp_pending = null where user_id = ${s.userId}`;
  await audit("totp_disabled", s);
  revalidatePath("/admin/security");
  return { error: null };
}

/* ---------------------------------------------------------------- security page data */

export interface SecurityView {
  error: string | null;
  email?: string;
  totp?: boolean;
  passwordChangedAt?: string;
  sessions?: { current: boolean; createdAt: string; lastSeenAt: string; ip: string; device: string }[];
  log?: { at: string; email: string | null; action: string; ip: string | null }[];
}

export async function securityView(): Promise<SecurityView> {
  const s = await fullAdmin();
  if (!s) return { error: "Sign in to the admin area first." };
  const roles = await adminRolesFor(s.userId, s.email, true);
  const [c] = (await sql()`select totp_secret is not null as totp, password_changed_at from app.admin_credentials where user_id = ${s.userId}`) as { totp: boolean; password_changed_at: string }[];
  const sessions = (await sql()`select token_hash, created_at, last_seen_at, ip, user_agent from app.admin_sessions where user_id = ${s.userId} and expires_at > now() order by last_seen_at desc limit 20`) as { token_hash: string; created_at: string; last_seen_at: string; ip: string; user_agent: string }[];
  // Super admins see everyone's events; other admins see their own.
  const log = (roles.isSuperAdmin
    ? await sql()`select at, email, action, ip from app.admin_audit order by at desc limit 60`
    : await sql()`select at, email, action, ip from app.admin_audit where user_id = ${s.userId} order by at desc limit 60`) as { at: string; email: string | null; action: string; ip: string | null }[];
  return {
    error: null,
    email: s.email,
    totp: c?.totp ?? false,
    passwordChangedAt: c ? new Date(c.password_changed_at).toISOString() : undefined,
    sessions: sessions.map((x) => ({ current: x.token_hash === s.tokenHash, createdAt: new Date(x.created_at).toISOString(), lastSeenAt: new Date(x.last_seen_at).toISOString(), ip: x.ip, device: x.user_agent })),
    log: log.map((l) => ({ ...l, at: new Date(l.at).toISOString() })),
  };
}

export async function signOutOtherSessions(): Promise<{ error: string | null }> {
  const s = await fullAdmin();
  if (!s) return { error: "Sign in to the admin area first." };
  await sql()`delete from app.admin_sessions where user_id = ${s.userId} and token_hash <> ${s.tokenHash}`;
  await audit("signed_out_other_sessions", s);
  return { error: null };
}

/**
 * Super admin only: gives another admin a one-time temporary password (shown once, never stored in readable form).
 * They must replace it at their first sign-in. Also unlocks the account and ends their sessions.
 */
export async function issueTemporaryPassword(userId: string): Promise<{ error: string | null; password?: string; email?: string }> {
  const s = await fullAdmin();
  if (!s) return { error: "Sign in to the admin area first." };
  if (!(await adminRolesFor(s.userId, s.email, true)).isSuperAdmin) return { error: "Only a super admin can do that." };
  const id = str(userId, 80).trim();
  const [u] = (await sql()`select id::text as id, lower(email) as email from neon_auth."user" where id::text = ${id}`) as { id: string; email: string }[];
  if (!u) return { error: "No such account." };
  const roles = await adminRolesFor(u.id, u.email, true);
  if (!roles.isAdmin) return { error: "Make them an admin first." };
  // 4 groups of 5 random characters: about 100 bits.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const pw = Array.from({ length: 20 }, (_, i) => alphabet[randomInt(alphabet.length)] + ((i + 1) % 5 === 0 && i < 19 ? "-" : "")).join("");
  const hash = await hashPassword(pw);
  await sql()`insert into app.admin_credentials (user_id, email, password_hash, must_change) values (${u.id}, ${u.email}, ${hash}, true)
    on conflict (user_id) do update set email = excluded.email, password_hash = excluded.password_hash, must_change = true, password_changed_at = now()`;
  await sql()`delete from app.admin_sessions where user_id = ${u.id}`;
  await sql()`delete from app.auth_locks where scope = 'email' and key = ${u.email}`;
  await audit("temporary_password_issued", s, { for: u.email });
  return { error: null, password: pw, email: u.email };
}
