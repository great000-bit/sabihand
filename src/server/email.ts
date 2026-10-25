import { noticesFor, renderEmail } from "@/lib/notifications";
import type { AppState } from "@/lib/types";
import { sql } from "./db";

/** Emails go out only when RESEND_API_KEY and EMAIL_FROM are set. Until then everything below does nothing. */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

const siteUrl = () => process.env.SITE_URL || "https://sabihand.vercel.app";

async function emailsFor(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = (await sql()`select id::text as id, email from neon_auth."user" where id::text = any(${ids})`) as { id: string; email: string }[];
  return new Map(rows.map((r) => [r.id, r.email]));
}

/**
 * Sends the emails a change deserves. Never throws and never slows or fails the change itself: a missing key,
 * a bad address or a provider outage is logged and the booking carries on.
 */
export async function notifyChanges(before: AppState, after: AppState): Promise<void> {
  if (!emailEnabled()) return;
  try {
    const notices = noticesFor(before, after);
    if (notices.length === 0) return;
    const to = await emailsFor([...new Set(notices.map((n) => n.toUserId))]);
    await Promise.all(
      notices.map(async (n) => {
        const address = to.get(n.toUserId);
        if (!address) return;
        const { html, text } = renderEmail(n, siteUrl());
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: process.env.EMAIL_FROM, to: address, subject: n.subject, html, text }),
        });
        if (!res.ok) console.error("email failed", res.status, await res.text().catch(() => ""));
      }),
    );
  } catch (e) {
    console.error("notify failed", e);
  }
}
