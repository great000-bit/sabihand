import { describe, expect, it } from "vitest";
import * as e from "./engine";
import { noticesFor, renderEmail } from "./notifications";
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
    step(e.acceptQuote(s, id, as(customer)));
    expect(step(e.recordPayment(s, id, { providerRef: "ref1", amountKobo: nairaToKobo(12000) }, base)).map((x) => x.toUserId).sort()).toEqual([customer.id, owner.id].sort());
    expect(step(e.startJob(s, id, as(owner)))).toMatchObject([{ toUserId: customer.id }]);
    expect(step(e.raiseDispute(s, id, "Not finished", as(customer)))).toMatchObject([{ toUserId: owner.id }]);
    const decided = step(e.resolveDispute(s, id, "release", "Fine", as(admin)));
    expect(decided.map((x) => x.toUserId).sort()).toEqual([customer.id, owner.id].sort());
    expect(decided.find((x) => x.toUserId === owner.id)?.lines[0]).toMatch(/team reviewed/);
  });
  it("sends nothing when nothing changed, and tells an artisan their verification result", () => {
    expect(noticesFor(start, start)).toEqual([]);
    const done = e.decideVerification(start, "a1", "verified", ["phone"], "", as(admin));
    expect(noticesFor(start, done)).toMatchObject([{ toUserId: owner.id, subject: "You are verified on Sabihand" }]);
  });
  it("escapes user text in the email body", () => {
    const { html, text } = renderEmail({ toUserId: "x", subject: "Hi <script>", lines: ["Ada <b>Obi</b>"], path: "/requests/1", cta: "Open" }, "https://x.test/");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Ada &lt;b&gt;Obi&lt;/b&gt;");
    expect(text).toContain("https://x.test/requests/1");
  });
});
