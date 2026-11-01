/**
 * One way to send an email, whichever provider is behind it. Both providers are plain HTTPS calls, so they work on
 * Vercel's serverless functions (no SMTP sockets, no SDK).
 *
 * - Brevo (default): needs only a verified single sender address, so it works before Sabihand owns a domain.
 *   Set BREVO_API_KEY and EMAIL_FROM ("Sabihand <you@gmail.com>", the address you verified in Brevo).
 * - Resend: needs a verified domain. Set RESEND_API_KEY and EMAIL_FROM on that domain.
 *
 * EMAIL_PROVIDER ("brevo" | "resend") picks one when both keys are set. With no key and sender, nothing is sent.
 */
export type Provider = "brevo" | "resend";
type Env = Record<string, string | undefined>;

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function emailProvider(env: Env = process.env): Provider | null {
  if (!env.EMAIL_FROM) return null;
  const want = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (want === "resend") return env.RESEND_API_KEY ? "resend" : null;
  if (want === "brevo") return env.BREVO_API_KEY ? "brevo" : null;
  if (env.BREVO_API_KEY) return "brevo";
  if (env.RESEND_API_KEY) return "resend";
  return null;
}

export const emailEnabled = () => emailProvider() !== null;

/** "Sabihand <hello@x.com>" or "hello@x.com" -> name and address. */
export function parseSender(from: string): { name: string; email: string } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || "Sabihand", email: m[2].trim() };
  return { name: "Sabihand", email: from.trim() };
}

/** Builds the provider's HTTP request. Kept apart from sending so it can be tested without a network. */
export function requestFor(provider: Provider, mail: Mail, env: Env = process.env): { url: string; init: RequestInit } {
  const from = env.EMAIL_FROM ?? "";
  if (provider === "brevo") {
    return {
      url: "https://api.brevo.com/v3/smtp/email",
      init: {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY ?? "", "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ sender: parseSender(from), to: [{ email: mail.to }], subject: mail.subject, htmlContent: mail.html, textContent: mail.text }),
      },
    };
  }
  return {
    url: "https://api.resend.com/emails",
    init: {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text }),
    },
  };
}

/**
 * Sends one email. Never throws: returns false and logs when emails are off, the provider refuses, or the network
 * fails, so a failed email can never fail the action that caused it.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const provider = emailProvider();
  if (!provider) {
    console.info("email off (set BREVO_API_KEY and EMAIL_FROM):", mail.subject);
    return false;
  }
  try {
    const { url, init } = requestFor(provider, mail);
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error(`email failed (${provider})`, res.status, (await res.text().catch(() => "")).slice(0, 500));
      return false;
    }
    return true;
  } catch (e) {
    console.error(`email failed (${provider})`, e);
    return false;
  }
}
