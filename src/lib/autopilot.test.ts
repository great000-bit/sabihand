import { describe, expect, it } from "vitest";
import * as e from "./engine";
import { DEFAULT_RULES, cleanRules, namesMatch, planAutopilot, type AutopilotRules } from "./autopilot";
import { nairaToKobo } from "./money";
import type { AppState, Artisan, Viewer } from "./types";

let n = 0;
const base = { now: "2026-11-01T10:00:00.000Z", id: (p: string) => `${p}${++n}` };
const customer: Viewer = { id: "u-cust", name: "Ada Obi", email: "ada@example.com", isAdmin: false };
const owner: Viewer = { id: "u-art", name: "Tunde Bello", email: "t@example.com", isAdmin: false };
const as = (user: Viewer) => ({ ...base, user });
const bank = { bankName: "GTBank", accountNumber: "0123456789", accountName: "BELLO TUNDE ADEWALE", bankCode: "058", verified: true };
const artisan: Artisan = {
  id: "a1", ownerId: owner.id, name: "Tunde Bello", businessName: "Bello Electricals", phone: "+2348031234567", trade: "electrical", areaIds: ["lagos-yaba"],
  bio: "Wiring, sockets and inverters for homes and shops since 2015.", availability: "", services: [{ title: "Fix", minKobo: 100, maxKobo: null }],
  portfolio: [{ id: "w1", caption: "", imageId: "img1" }], photoId: "img0", verification: { status: "pending", checks: [] }, joinedAt: base.now, bank,
};
const on: AutopilotRules = { ...DEFAULT_RULES, enabled: true, payouts: { on: true, maxNaira: 50000, waitHours: 24 }, verification: { ...DEFAULT_RULES.verification, on: true } };

/** A job that the customer has confirmed, so its payment is released. */
function released(amount = 20000): AppState {
  let s: AppState = { artisans: [artisan], bookings: [], payments: [], reviews: [], reports: [] };
  s = e.createRequest(s, { artisanId: "a1", areaId: "lagos-yaba", title: "Fix socket", description: "Two sockets are dead", preferredDate: "2026-10-30", phone: "08031234567" }, as(customer));
  const id = s.bookings[0].id;
  s = e.sendQuote(s, id, { amountKobo: nairaToKobo(amount), description: "x", proposedDate: "Mon" }, as(owner));
  s = e.acceptQuote(s, id, as(customer));
  s = e.recordPayment(s, id, { providerRef: `r${++n}`, amountKobo: nairaToKobo(amount) }, base);
  s = e.startJob(s, id, as(owner));
  return e.confirmDone(s, id, as(customer));
}
const later = "2026-11-02T11:00:00.000Z";

describe("autopilot", () => {
  it("does nothing when switched off, or with a job switched off", () => {
    expect(planAutopilot(released(), DEFAULT_RULES, later).actions).toEqual([]);
    expect(planAutopilot(released(), { ...on, payouts: { ...on.payouts, on: false }, verification: { ...on.verification, on: false } }, later).actions).toEqual([]);
  });
  it("pays a released job after the wait, within the limit, to a bank-confirmed account", () => {
    const s = released();
    expect(planAutopilot(s, on, "2026-11-01T12:00:00.000Z").actions.filter((a) => a.kind === "payout")).toEqual([]);
    expect(planAutopilot(s, on, later).actions).toContainEqual(expect.objectContaining({ kind: "payout", amountKobo: nairaToKobo(18000) }));
  });
  it("leaves big payouts, unconfirmed bank accounts and jobs with an open problem for a person", () => {
    expect(planAutopilot(released(90000), on, later).waiting[0].reason).toMatch(/limit/);
    const noBank = released();
    noBank.artisans = [{ ...artisan, bank: { ...bank, verified: false } }];
    expect(planAutopilot(noBank, on, later).waiting[0].reason).toMatch(/not confirmed/);
    const s = released();
    s.reports = [{ id: "r1", kind: "booking", targetId: s.bookings[0].id, reason: "x", reporterName: "Ada", createdAt: base.now }];
    expect(planAutopilot(s, on, later).waiting[0].reason).toMatch(/open problem/);
  });
  it("never pays twice: an already paid-out payment is skipped", () => {
    const s = released();
    const paid = e.markPaidOut(s, s.payments[0].id, "ref", as({ id: "x", name: "x", email: "", isAdmin: true }));
    expect(planAutopilot(paid, on, later).actions.filter((a) => a.kind === "payout")).toEqual([]);
  });
  it("verifies only pending artisans who pass every check, and never rejects", () => {
    const s = released();
    expect(planAutopilot(s, on, later).actions).toContainEqual({ kind: "verify", artisanId: "a1" });
    s.artisans = [{ ...artisan, photoId: undefined, bank: { ...bank, accountName: "CHIOMA OKAFOR" } }];
    const plan = planAutopilot(s, on, later);
    expect(plan.actions.filter((a) => a.kind === "verify")).toEqual([]);
    expect(plan.waiting.find((w) => w.kind === "verify")?.reason).toMatch(/does not match.*no profile photo/);
  });
  it("marks a bot verification as done by autopilot with the bank check", () => {
    const s = e.decideVerification(released(), "a1", "verified", ["bank"], "", as({ id: e.AUTOPILOT_ID, name: "bot", email: "", isAdmin: true }));
    expect(s.artisans[0].verification).toMatchObject({ status: "verified", checks: ["bank"], by: "autopilot" });
  });
  it("matches names the way banks write them", () => {
    expect(namesMatch("Tunde Bello", "BELLO TUNDE ADEWALE")).toBe(true);
    expect(namesMatch("Tunde Bello", "TUNDE OKAFOR")).toBe(false);
    expect(namesMatch("Chioma", "OKAFOR CHIOMA")).toBe(true);
  });
  it("cleans stored or typed rules", () => {
    expect(cleanRules({ enabled: "yes", payouts: { maxNaira: -5, waitHours: 9999 } })).toMatchObject({ enabled: false, payouts: { maxNaira: 0, waitHours: 720 } });
  });
});
