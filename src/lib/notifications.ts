import { tradeById } from "./catalog";
import { formatNaira } from "./money";
import type { AppState, Booking } from "./types";

/** One email to send: who gets it, what it says, and the page the button opens. */
/** Sent as toUserId to mean "every Sabihand admin". The server turns it into the admins' addresses. */
export const ADMINS = "@admins";

export interface Notice {
  /** Id of the signed-in user (customer id, or the artisan's ownerId), or ADMINS. */
  toUserId: string;
  subject: string;
  /** Plain sentences, one per paragraph. */
  lines: string[];
  path: string;
  cta: string;
}

const same = (a: Booking, b: Booking) => a.status === b.status && a.quote?.sentAt === b.quote?.sentAt && a.artisanMarkedDoneAt === b.artisanMarkedDoneAt;

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

    if (b.artisanMarkedDoneAt && b.artisanMarkedDoneAt !== was.artisanMarkedDoneAt && b.status === was.status) {
      out.push(cust({ subject: `${who} says ${b.title} is done`, lines: [`${who} has marked ${b.title} as done.`, "Check the work, then confirm to release the payment. If something is wrong, report a problem instead."], path: jobPath, cta: "Check and confirm" }));
      continue;
    }

    if (b.status === "accepted" && b.quote) {
      out.push(cust({ subject: `${who} sent you a price`, lines: [`${who} quoted ${formatNaira(b.quote.amountKobo)} for ${b.title}.`, "Accept it to pay safely. We hold your money until the job is done."], path: jobPath, cta: "See the price" }));
    } else if (b.status === "awaiting_payment") {
      out.push(art({ subject: `${b.customerName} accepted your price`, lines: [`${b.customerName} accepted your price of ${formatNaira(b.quote?.amountKobo ?? 0)} for ${b.title}.`, "We will tell you as soon as they pay. Do not start until the payment is held."], path: jobPath, cta: "See the job" }));
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
      out.push({ toUserId: ADMINS, subject: `Dispute opened: ${b.title}`, lines: [`${toArtisan ? b.customerName : who} reported a problem with ${b.title} (${who} for ${b.customerName}).`, ...(last?.note ? [`What they said: ${last.note}`] : []), "The payment is held until you release it or refund the customer."], path: "/admin", cta: "Decide in admin" });
    }
  }

  const old = new Map(before.artisans.map((a) => [a.id, a]));
  for (const a of after.artisans) {
    const was = old.get(a.id);
    if (!was) {
      out.push({ toUserId: a.ownerId, subject: "Your Sabihand artisan profile is live", lines: [`Welcome, ${a.name}. Customers near you can now find ${a.businessName || "you"}.`, "Get verified to show the Verified badge, and add your bank details so we can pay you."], path: "/artisan", cta: "Open your dashboard" });
      out.push({ toUserId: ADMINS, subject: `New artisan: ${a.businessName || a.name}`, lines: [`${a.name} joined as an artisan (${tradeById(a.trade)?.label ?? a.trade}).`, "Check their details when they ask to be verified."], path: "/admin", cta: "Open admin" });
      continue;
    }
    if (was.verification.status === a.verification.status) continue;
    if (a.verification.status === "pending") {
      out.push({ toUserId: ADMINS, subject: `Verify ${a.businessName || a.name}`, lines: [`${a.name} asked to be verified.`], path: "/admin", cta: "Review in admin" });
      continue;
    }
    if (a.verification.status === "verified") out.push({ toUserId: a.ownerId, subject: "You are verified on Sabihand", lines: ["Our team checked your details and your profile now shows the Verified badge.", "Customers search verified artisans first."], path: `/artisans/${a.id}`, cta: "See your profile" });
    else if (a.verification.status === "rejected") out.push({ toUserId: a.ownerId, subject: "Your verification needs attention", lines: ["We could not verify your profile yet.", ...(a.verification.note ? [`Note from our team: ${a.verification.note}`] : [])], path: "/artisan", cta: "Open your dashboard" });
  }
  const oldPay = new Map(before.payments.map((p) => [p.id, p]));
  for (const p of after.payments) {
    if (!p.payout || oldPay.get(p.id)?.payout) continue;
    const b = after.bookings.find((x) => x.id === p.bookingId);
    const a = b && owner(b.artisanId);
    if (!a || !b) continue;
    out.push({ toUserId: a.ownerId, subject: `We sent your money for ${b.title}`, lines: [`${formatNaira(p.amountKobo - p.commissionKobo)} is on its way to your bank account for ${b.title}.`, `Transfer reference: ${p.payout.reference}`], path: "/artisan", cta: "See your payouts" });
  }

  const oldReports = new Set(before.reports.map((r) => r.id));
  for (const r of after.reports) {
    if (oldReports.has(r.id) || r.kind === "booking") continue; // booking problems are covered by the dispute email
    out.push({ toUserId: ADMINS, subject: r.kind === "review" ? "A review was reported" : "An artisan was reported", lines: [`${r.reporterName} said: ${r.reason}`], path: "/admin", cta: "Open reports" });
  }
  return out;
}

/** The first email a new account gets. */
export function welcomeNotice(userId: string, name: string): Notice {
  const first = name.trim().split(/\s+/)[0] || "there";
  return { toUserId: userId, subject: "Welcome to Sabihand", lines: [`Hi ${first}, welcome to Sabihand.`, "Find a verified artisan near you, get a price before they come, and pay safely. We hold your money until the job is done.", "Are you an artisan? Create your profile and let customers near you find you."], path: "/artisans", cta: "Find an artisan" };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderEmail(n: Notice, siteUrl: string): { html: string; text: string } {
  const url = `${siteUrl.replace(/\/$/, "")}${n.path}`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#05070d">
<div style="background:#05070d;padding:32px 12px;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:480px;margin:0 auto;background:#0B1F4B;border-radius:20px;padding:28px 24px;color:#ffffff">
<p style="margin:0 0 24px;font-size:15px;font-weight:bold;letter-spacing:4px;color:#E3A92B">SABIHAND</p>
<h1 style="font-size:21px;line-height:1.3;margin:0 0 16px;color:#ffffff">${esc(n.subject)}</h1>
${n.lines.map((l) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px;color:#c9d2e6">${esc(l)}</p>`).join("\n")}
<p style="margin:24px 0 8px"><a href="${esc(url)}" style="background:#E3A92B;color:#0B1F4B;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block">${esc(n.cta)}</a></p>
</div>
<p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#7a869c;text-align:center">Sabihand · Trusted Hands Near You.<br>You get this email because of activity on your Sabihand account.</p>
</div></body></html>`;
  const text = `${n.subject}\n\n${n.lines.join("\n\n")}\n\n${n.cta}: ${url}\n\nSabihand`;
  return { html, text };
}
