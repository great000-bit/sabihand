import { after } from "next/server";
import { ADMINS, noticesFor, renderEmail, welcomeNotice, type Notice } from "@/lib/notifications";
import type { AppState, Viewer } from "@/lib/types";
import { sql } from "./db";
import { emailEnabled, sendMail } from "./mailer";

export { emailEnabled } from "./mailer";

const siteUrl = () => process.env.SITE_URL || "https://sabihand.vercel.app";
const list = (v?: string) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Runs work after the response is sent, so emails never slow a button. Falls back to running it now outside a request. */
function later(work: () => Promise<void>) {
  try {
    after(work);
  } catch {
    void work();
  }
}

async function emailsFor(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = (await sql()`select id::text as id, email from neon_auth."user" where id::text = any(${ids})`) as { id: string; email: string }[];
  return new Map(rows.map((r) => [r.id, r.email]));
}

/** Every admin's address: super admins and ADMIN_USER_IDS from settings, the admins added in /admin, and ADMIN_EMAILS. */
async function adminEmails(): Promise<string[]> {
  let added: string[] = [];
  try {
    added = ((await sql()`select user_id from app.admins`) as { user_id: string }[]).map((r) => r.user_id);
  } catch (e) {
    console.error("admin list failed", e);
  }
  const ids = [...new Set([...list(process.env.SUPER_ADMIN_USER_IDS), ...list(process.env.ADMIN_USER_IDS), ...added])];
  const byId = await emailsFor(ids);
  return [...new Set([...byId.values(), ...list(process.env.ADMIN_EMAILS)].map((e) => e.toLowerCase()))];
}

async function deliver(notices: Notice[]): Promise<void> {
  const people = await emailsFor([...new Set(notices.map((n) => n.toUserId).filter((id) => id !== ADMINS))]);
  const admins = notices.some((n) => n.toUserId === ADMINS) ? await adminEmails() : [];
  await Promise.all(
    notices.flatMap((n) => {
      const to = n.toUserId === ADMINS ? admins : [people.get(n.toUserId)].filter((x): x is string => Boolean(x));
      const { html, text } = renderEmail(n, siteUrl());
      return to.map((address) => sendMail({ to: address, subject: n.subject, html, text }));
    }),
  );
}

/**
 * Sends the emails a change deserves, after the response. Never throws and never slows or fails the change itself:
 * a missing key, a bad address or a provider outage is logged and the booking carries on.
 */
export async function notifyChanges(before: AppState, after: AppState): Promise<void> {
  if (!emailEnabled()) return;
  let notices: Notice[];
  try {
    notices = noticesFor(before, after);
  } catch (e) {
    console.error("notify failed", e);
    return;
  }
  if (notices.length === 0) return;
  later(() => deliver(notices).catch((e) => console.error("notify failed", e)));
}

/**
 * Welcome email, once per account. app.welcomed remembers who already got it (accounts that existed before this
 * email was added are marked as welcomed by migration 0007). Called after every sign-in; does nothing the second time.
 */
export function welcomeOnce(viewer: Viewer): void {
  if (!emailEnabled() || !viewer.email) return;
  later(async () => {
    try {
      const fresh = (await sql()`insert into app.welcomed (user_id) values (${viewer.id}) on conflict do nothing returning user_id`) as unknown[];
      if (fresh.length === 0) return;
      const n = welcomeNotice(viewer.id, viewer.name);
      const { html, text } = renderEmail(n, siteUrl());
      await sendMail({ to: viewer.email, subject: n.subject, html, text });
    } catch (e) {
      console.error("welcome email failed", e);
    }
  });
}
