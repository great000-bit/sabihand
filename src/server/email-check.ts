import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { Viewer } from "@/lib/types";
import { renderCodeEmail } from "@/lib/notifications";
import { dbConfigured, sql } from "./db";
import { emailEnabled, sendMail } from "./mailer";

/**
 * Email check for accounts made with email and password: a 6-digit code is emailed, and the account counts as real
 * once the code is entered. Google accounts arrive already checked by Google.
 *
 * When email sending is off (no provider set) nobody is asked for a code, because nobody could receive one.
 */
export const CODE_MINUTES = 15;
export const RESEND_SECONDS = 60;
export const MAX_TRIES = 5;

const siteUrl = () => process.env.SITE_URL || "https://sabihand.vercel.app";
const hash = (userId: string, code: string) => createHmac("sha256", process.env.NEON_AUTH_COOKIE_SECRET || "sabihand").update(`${userId}:${code}`).digest("hex");

export const emailCheckOn = () => dbConfigured && emailEnabled();

/** True when the account's email is confirmed, or when checking is off. A lookup failure never locks anyone out. */
export async function emailConfirmed(userId: string): Promise<boolean> {
  if (!emailCheckOn()) return true;
  try {
    const rows = (await sql()`select "emailVerified" as ok from neon_auth."user" where id::text = ${userId}`) as { ok: boolean }[];
    return rows.length === 0 || rows[0].ok === true;
  } catch (e) {
    console.error("email check lookup failed", e);
    return true;
  }
}

export type SendResult = { ok: true; wait: number; sent: boolean } | { ok: false; error: string };

/**
 * Sends a code. `force` is the "Send a new code" button. `sent` false means nothing went out, and `wait` says how many
 * seconds until a new code may be asked for. Safe to call twice in a row: the second call sends nothing.
 */
export async function sendEmailCode(viewer: Viewer, force = false): Promise<SendResult> {
  if (!viewer.email) return { ok: false, error: "Your account has no email address." };
  const db = sql();
  const [last] = (await db`select extract(epoch from now() - sent_at)::int as ago, expires_at > now() as live from app.email_codes where user_id = ${viewer.id}`) as { ago: number; live: boolean }[];
  const wait = last ? Math.max(0, RESEND_SECONDS - last.ago) : 0;
  // Opening the page again keeps a code that still works; "Send a new code" replaces it, at most once a minute.
  if (last && !force && last.live) return { ok: true, sent: false, wait };
  if (last && force && wait > 0) return { ok: true, sent: false, wait };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db`insert into app.email_codes (user_id, code_hash, expires_at, attempts, sent_at)
    values (${viewer.id}, ${hash(viewer.id, code)}, now() + make_interval(mins => ${CODE_MINUTES}), 0, now())
    on conflict (user_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = now()`;
  const mail = renderCodeEmail(viewer.name, code, siteUrl());
  try {
    await sendMail({ to: viewer.email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (e) {
    console.error("code email failed", e);
    await db`update app.email_codes set sent_at = now() - make_interval(secs => ${RESEND_SECONDS}) where user_id = ${viewer.id}`;
    return { ok: false, error: "We could not send the email. Please try again." };
  }
  return { ok: true, sent: true, wait: RESEND_SECONDS };
}

export type CheckResult = { ok: true } | { ok: false; error: string; expired?: boolean };

/** Checks a code. Five wrong tries or 15 minutes end a code; then a new one must be asked for. */
export async function checkEmailCode(viewer: Viewer, raw: string): Promise<CheckResult> {
  const code = String(raw ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Enter the 6-digit code from the email." };
  const db = sql();
  // Count the try first, in one step, so two quick guesses can't both slip under the limit.
  const [row] = (await db`update app.email_codes set attempts = attempts + 1 where user_id = ${viewer.id}
    returning code_hash, attempts, expires_at > now() as live`) as { code_hash: string; attempts: number; live: boolean }[];
  if (!row) return { ok: false, error: "That code has expired. Tap “Send a new code”.", expired: true };
  if (!row.live) return { ok: false, error: "That code has expired. Tap “Send a new code”.", expired: true };
  if (row.attempts > MAX_TRIES) return { ok: false, error: "Too many wrong tries. Tap “Send a new code”.", expired: true };
  const a = Buffer.from(row.code_hash, "hex");
  const b = Buffer.from(hash(viewer.id, code), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    const left = MAX_TRIES - row.attempts;
    return { ok: false, error: left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Tap “Send a new code”.", expired: left <= 0 };
  }
  await db`update neon_auth."user" set "emailVerified" = true, "updatedAt" = now() where id::text = ${viewer.id}`;
  await db`delete from app.email_codes where user_id = ${viewer.id}`;
  return { ok: true };
}
