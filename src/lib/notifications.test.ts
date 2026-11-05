import { describe, expect, it } from "vitest";
import * as e from "./engine";
import { ADMINS, noticesFor, renderCodeEmail, renderEmail, welcomeNotice } from "./notifications";
import { nairaToKobo } from "./money";
import type { AppState, Artisan, Viewer } from "./types";

let n = 0;
const base = { now: "2026-10-25T10:00:00.000Z", id: (p: string) => `${p}${++n}` };
const customer: Viewer = { id: "u-cust", name: "Ada <b>Obi</b>", email: "ada@example.com", isAdmin: false };
const owner: Viewer = { id: "u-art", name: "Tunde Bello", email: "tunde@example.com", isAdmin: false };
const admin: Viewer = { id: "u-admin", name: "Admin", email: "admin@example.com", isAdmin: true };
const as = (user: Viewer) => ({ ...base, user });

const artisan: Artisan = {
  id: "a1", ownerId: owner.id, name: "Tunde Bello", businessName: "Bello Electricals", phone: "+2348031234567", trade: "electrical",
  areaIds: ["lagos-yaba"], bio: "", availability: "", services: [{ title: "Fix", minKobo: 100, maxKobo: null }], portfolio: [],
  verification: { status: "pending", checks: [] }, joinedAt: base.now,
};
const start: AppState = { artisans: [artisan], bookings: [], payments: [], reviews: [], reports: [] };
const request = { artisanId: "a1", areaId: "lagos-yaba", title: "Fix socket", description: "Two sockets are dead", preferredDate: "2026-10-30", phone: "0803 123 4567" };

describe("notifications", () => {
  it("tells the artisan about a new request and the customer about the quote", () => {
    const s1 = e.createRequest(start, request, as(customer));
    expect(noticesFor(start, s1)).toMatchObject([{ toUserId: owner.id, subject: "New request: Fix socket" }]);
    const id = s1.bookings[0].id;
    const s2 = e.sendQuote(s1, id, { amountKobo: nairaToKobo(12000), description: "Two sockets", proposedDate: "Mon" }, as(owner));
    const [q] = noticesFor(s1, s2);
    expect(q.toUserId).toBe(customer.id);
    expect(q.lines.join(" ")).toContain("₦12,000");
  });
  it("covers payment, start, confirmation and a dispute decision", () => {
    let s = e.createRequest(start, request, as(customer));
    const id = s.bookings[0].id;
    const step = (next: AppState) => { const out = noticesFor(s, next); s = next; return out; };
    step(e.sendQuote(s, id, { amountKobo: nairaToKobo(12000), description: "x", proposedDate: "Mon" }, as(owner)));
    expect(step(e.acceptQuote(s, id, as(customer)))).toMatchObject([{ toUserId: owner.id, subject: "Ada <b>Obi</b> accepted your price" }]);
    expect(step(e.recordPayment(s, id, { providerRef: "ref1", amountKobo: nairaToKobo(12000) }, base)).map((x) => x.toUserId).sort()).toEqual([customer.id, owner.id].sort());
    expect(step(e.startJob(s, id, as(owner)))).toMatchObject([{ toUserId: customer.id }]);
    expect(step(e.raiseDispute(s, id, "Not finished", as(customer)))).toMatchObject([{ toUserId: owner.id }, { toUserId: ADMINS, subject: "Dispute opened: Fix socket" }]);
    const decided = step(e.resolveDispute(s, id, "release", "Fine", as(admin)));
    expect(decided.map((x) => x.toUserId).sort()).toEqual([customer.id, owner.id].sort());
    expect(decided.find((x) => x.toUserId === owner.id)?.lines[0]).toMatch(/team reviewed/);
  });
  it("sends nothing when nothing changed, and tells an artisan their verification result", () => {
    expect(noticesFor(start, start)).toEqual([]);
    const done = e.decideVerification(start, "a1", "verified", ["phone"], "", as(admin));
    expect(noticesFor(start, done)).toMatchObject([{ toUserId: owner.id, subject: "You are verified on Sabihand" }]);
  });
  it("tells the customer when the artisan marks the job done, and the artisan when they are paid out", () => {
    let s = e.createRequest(start, request, as(customer));
    const id = s.bookings[0].id;
    s = e.sendQuote(s, id, { amountKobo: nairaToKobo(10000), description: "x", proposedDate: "Mon" }, as(owner));
    s = e.acceptQuote(s, id, as(customer));
    s = e.recordPayment(s, id, { providerRef: "r9", amountKobo: nairaToKobo(10000) }, base);
    s = e.startJob(s, id, as(owner));
    const done = e.markDone(s, id, as(owner));
    expect(noticesFor(s, done)).toMatchObject([{ toUserId: customer.id, cta: "Check and confirm" }]);
    const released = e.confirmDone(done, id, as(customer));
    const paidOut = e.markPaidOut(released, released.payments[0].id, "TRF123", as(admin));
    const [n] = noticesFor(released, paidOut);
    expect(n).toMatchObject({ toUserId: owner.id });
    expect(n.lines.join(" ")).toContain("TRF123");
  });
  it("tells admins about new artisans, verification requests and reported reviews", () => {
    const joined = e.registerArtisan({ ...start, artisans: [] }, { name: "Tunde Bello", businessName: "Bello Electricals", phone: "08031234567", trade: "electrical", areaIds: ["lagos-yaba"], bio: "", availability: "", service: { title: "Fix", minNaira: 1000, maxNaira: null } }, as(owner));
    expect(noticesFor({ ...start, artisans: [] }, joined).map((x) => x.toUserId)).toEqual([owner.id, ADMINS]);
    const rejected = { ...start, artisans: [{ ...artisan, verification: { status: "rejected" as const, checks: [] } }] };
    expect(noticesFor(rejected, e.submitVerification(rejected, "a1", as(owner)))).toMatchObject([{ toUserId: ADMINS }]);
  });
  it("writes a welcome email using the first name", () => {
    expect(welcomeNotice("u1", "Ada Obi").lines[0]).toBe("Hi Ada, welcome to Sabihand.");
  });
  it("escapes user text in the email body", () => {
    const { html, text } = renderEmail({ toUserId: "x", subject: "Hi <script>", lines: ["Ada <b>Obi</b>"], path: "/requests/1", cta: "Open" }, "https://x.test/");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Ada &lt;b&gt;Obi&lt;/b&gt;");
    expect(text).toContain("https://x.test/requests/1");
  });
  it("picks the picture by who the email is for", () => {
    const base = { subject: "s", lines: ["l"], path: "/", cta: "c" };
    expect(renderEmail({ ...base, toUserId: "u", audience: "artisan" }, "https://x.test").html).toContain("https://x.test/email/hero-artisan.jpg");
    expect(renderEmail({ ...base, toUserId: "u", audience: "customer" }, "https://x.test").html).toContain("/email/hero-customer.jpg");
    expect(renderEmail({ ...base, toUserId: ADMINS }, "https://x.test").html).toContain("/email/hero-team.jpg");
    expect(welcomeNotice("u1", "Ada").audience).toBeUndefined();
  });
});

describe("code email", () => {
  it("shows the code, the logo and escapes the name", () => {
    const m = renderCodeEmail("Ada <b>", "042917", "https://x.test/");
    expect(m.subject).toBe("042917 is your Sabihand code");
    expect(m.html).toContain(">042917<");
    expect(m.html).toContain("https://x.test/email/logo-chip.png");
    expect(m.html).not.toContain("<b>");
    expect(m.text).toContain("042917");
  });
});
