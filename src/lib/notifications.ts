import { formatNaira } from "./money";
import type { AppState, Booking } from "./types";

/** One email to send: who gets it, what it says, and the page the button opens. */
export interface Notice {
  /** Id of the signed-in user (customer id, or the artisan's ownerId). */
  toUserId: string;
  subject: string;
  /** Plain sentences, one per paragraph. */
  lines: string[];
  path: string;
  cta: string;
}

const same = (a: Booking, b: Booking) => a.status === b.status && a.quote?.sentAt === b.quote?.sentAt;

/**
 * Works out which emails a change deserves by comparing the state before and after it. Doing it by comparison
 * means every route that changes a booking (button, payment webhook, admin decision) notifies the same way.
 */
export function noticesFor(before: AppState, after: AppState): Notice[] {
  const out: Notice[] = [];
  const owner = (artisanId: string) => after.artisans.find((a) => a.id === artisanId);
  const prev = new Map(before.bookings.map((b) => [b.id, b]));

  for (const b of after.bookings) {
    const a = owner(b.artisanId);
    if (!a) continue;
    const was = prev.get(b.id);
    const art = (n: Omit<Notice, "toUserId">): Notice => ({ toUserId: a.ownerId, ...n });
    const cust = (n: Omit<Notice, "toUserId">): Notice => ({ toUserId: b.customerId, ...n });
    const jobPath = `/requests/${b.id}`;
    const who = a.businessName || a.name;

    if (!was) {
      out.push(art({ subject: `New request: ${b.title}`, lines: [`${b.customerName} sent you a request: ${b.title}.`, "Reply with a price to win the job."], path: jobPath, cta: "See the request" }));
      continue;
    }
    if (same(was, b)) continue;

    if (b.status === "accepted" && b.quote) {
      out.push(cust({ subject: `${who} sent you a price`, lines: [`${who} quoted ${formatNaira(b.quote.amountKobo)} for ${b.title}.`, "Accept it to pay safely. We hold your money until the job is done."], path: jobPath, cta: "See the price" }));
    } else if (b.status === "declined") {
      out.push(cust({ subject: `${who} cannot take ${b.title}`, lines: [`${who} is not able to take this job.`, "Other verified artisans near you can."], path: "/artisans", cta: "Find another artisan" }));
    } else if (b.status === "confirmed") {
      out.push(cust({ subject: "Payment received", lines: [`Your payment for ${b.title} is held safely. ${who} can start work now.`], path: jobPath, cta: "See the booking" }));
      out.push(art({ subject: `Paid: ${b.title}`, lines: [`${b.customerName} has paid for ${b.title}. The money is held by Sabihand and released when the job is confirmed.`, "You can see the customer's phone number now."], path: jobPath, cta: "Start the job" }));
    } else if (b.status === "in_progress") {
      out.push(cust({ subject: `${who} has started ${b.title}`, lines: [`${who} has started work on ${b.title}.`], path: jobPath, cta: "See the booking" }));
    } else if (b.status === "completed") {
      const byAdmin = b.events[b.events.length - 1]?.actor === "admin";
      out.push(art({ subject: `Job confirmed: ${b.title}`, lines: [byAdmin ? "Our team reviewed the problem and released your payment." : `${b.customerName} confirmed the job. Your payment is released.`, "Payouts go to the bank account saved on your dashboard."], path: jobPath, cta: "See the job" }));
      out.push(cust({ subject: `How was ${who}?`, lines: [`${b.title} is marked complete.`, "A short review helps the next customer choose."], path: jobPath, cta: "Leave a review" }));
    } else if (b.status === "cancelled") {
      const last = b.events[b.events.length - 1];
      if (last?.actor === "admin") out.push(art({ subject: `Dispute decided: ${b.title}`, lines: ["Our team reviewed the problem and refunded the customer."], path: jobPath, cta: "See the job" }));
      if (last?.actor === "customer") out.push(art({ subject: `Cancelled: ${b.title}`, lines: [`${b.customerName} cancelled ${b.title}.`], path: jobPath, cta: "See the job" }));
      else out.push(cust({ subject: `Cancelled: ${b.title}`, lines: [last?.actor === "admin" ? "Our team reviewed the problem and decided in your favour. Your money is refunded." : `${who} cancelled ${b.title}.`, "Any payment you made is refunded."], path: jobPath, cta: "See the booking" }));
    } else if (b.status === "disputed") {
      const last = b.events[b.events.length - 1];
      const toArtisan = last?.actor === "customer";
      const n = { subject: `A problem was reported: ${b.title}`, lines: [`${toArtisan ? b.customerName : who} reported a problem with ${b.title}.`, "The payment is paused while our team looks into it. You may be asked for photos or detail."], path: jobPath, cta: "See the details" };
      out.push(toArtisan ? art(n) : cust(n));
    }
  }

  const old = new Map(before.artisans.map((a) => [a.id, a]));
  for (const a of after.artisans) {
    const was = old.get(a.id);
    if (!was || was.verification.status === a.verification.status) continue;
    if (a.verification.status === "verified") out.push({ toUserId: a.ownerId, subject: "You are verified on Sabihand", lines: ["Our team checked your details and your profile now shows the Verified badge.", "Customers search verified artisans first."], path: `/artisans/${a.id}`, cta: "See your profile" });
    else if (a.verification.status === "rejected") out.push({ toUserId: a.ownerId, subject: "Your verification needs attention", lines: ["We could not verify your profile yet.", ...(a.verification.note ? [`Note from our team: ${a.verification.note}`] : [])], path: "/artisan", cta: "Open your dashboard" });
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderEmail(n: Notice, siteUrl: string): { html: string; text: string } {
  const url = `${siteUrl.replace(/\/$/, "")}${n.path}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B1F4B">
<h1 style="font-size:20px;margin:0 0 16px">${esc(n.subject)}</h1>
${n.lines.map((l) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px;color:#44516B">${esc(l)}</p>`).join("\n")}
<p style="margin:20px 0"><a href="${esc(url)}" style="background:#E3A92B;color:#0B1F4B;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block">${esc(n.cta)}</a></p>
<p style="font-size:12px;color:#7a869c;margin:24px 0 0">Sabihand · Trusted hands, near you</p>
</div>`;
  const text = `${n.subject}\n\n${n.lines.join("\n\n")}\n\n${n.cta}: ${url}\n\nSabihand`;
  return { html, text };
}
