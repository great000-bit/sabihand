import { describe, expect, it } from "vitest";
import { initialState } from "./seed";
import * as e from "./engine";
import { commissionKobo, artisanPayoutKobo, formatNaira, formatPriceRange, nairaToKobo } from "./money";
import { canTransition } from "./booking";
import { ratingSummary } from "./reviews";
import { searchArtisans } from "./search";

let n = 0;
const ctx = { now: "2026-10-25T10:00:00.000Z", id: (p: string) => `${p}${++n}` };

function bookedJob() {
  let s = initialState();
  s = e.createRequest(s, { artisanId: "a4", trade: "electrical", areaId: "lagos-yaba", title: "Fix socket", description: "Two sockets in the lounge are dead", preferredDate: "2026-10-30" }, ctx);
  const id = s.bookings[0].id;
  s = e.sendQuote(s, id, { amountKobo: nairaToKobo(12500), description: "Replace two sockets", proposedDate: "2026-10-30" }, ctx);
  s = e.acceptQuote(s, id, ctx);
  s = e.payAndHold(s, id, ctx);
  return { s, id };
}

describe("money", () => {
  it("computes 10% commission in kobo and the artisan payout", () => {
    expect(commissionKobo(nairaToKobo(25000))).toBe(nairaToKobo(2500));
    expect(artisanPayoutKobo(nairaToKobo(12500))).toBe(nairaToKobo(11250));
  });
  it("formats naira and ranges", () => {
    expect(formatNaira(nairaToKobo(12500))).toBe("₦12,500");
    expect(formatPriceRange(nairaToKobo(8000), nairaToKobo(20000))).toBe("₦8k – ₦20k");
    expect(formatPriceRange(nairaToKobo(40000), null)).toContain("quote needed");
  });
  it("rejects invalid amounts", () => {
    expect(() => commissionKobo(-1)).toThrow();
    expect(() => commissionKobo(10.5)).toThrow();
  });
});

describe("booking flow", () => {
  it("holds payment, then releases it when the customer confirms", () => {
    const { s, id } = bookedJob();
    expect(s.bookings.find((b) => b.id === id)!.status).toBe("confirmed");
    expect(s.payments[0]).toMatchObject({ status: "held", provider: "demo", commissionKobo: nairaToKobo(1250) });
    let t = e.startJob(s, id, ctx);
    t = e.markDone(t, id, ctx);
    t = e.confirmDone(t, id, ctx);
    expect(t.bookings.find((b) => b.id === id)!.status).toBe("completed");
    expect(t.payments[0].status).toBe("released");
  });
  it("refunds a held payment when cancelled", () => {
    const { s, id } = bookedJob();
    const t = e.cancelBooking(s, id, "customer", ctx);
    expect(t.payments[0].status).toBe("refunded");
  });
  it("blocks illegal moves and wrong roles", () => {
    expect(canTransition("pending_response", "completed", "customer")).toBe(false);
    expect(canTransition("pending_response", "accepted", "customer")).toBe(false);
    expect(canTransition("disputed", "completed", "admin")).toBe(true);
    const s = initialState();
    expect(() => e.confirmDone(s, "b1", ctx)).toThrow();
  });
  it("does not double charge", () => {
    const { s, id } = bookedJob();
    expect(() => e.payAndHold(s, id, ctx)).toThrow();
  });
  it("requires a reason to dispute, and admin settles the money", () => {
    const { s, id } = bookedJob();
    expect(() => e.raiseDispute(s, id, "customer", " ", ctx)).toThrow();
    let t = e.raiseDispute(s, id, "customer", "Artisan did not show up", ctx);
    expect(t.reports).toHaveLength(1);
    t = e.resolveDispute(t, id, "refund", "Refunded after no-show", ctx);
    expect(t.payments[0].status).toBe("refunded");
    expect(t.reports[0].resolvedAt).toBeDefined();
  });
});

describe("reviews", () => {
  it("only after completion, once per job, and never invented", () => {
    const { s, id } = bookedJob();
    expect(() => e.submitReview(s, id, 5, "great", ctx)).toThrow();
    let t = e.confirmDone(e.startJob(s, id, ctx), id, ctx);
    t = e.submitReview(t, id, 4, "Good work", ctx);
    expect(() => e.submitReview(t, id, 5, "again", ctx)).toThrow();
    expect(ratingSummary(t.reviews)).toEqual({ count: 1, average: 4 });
    expect(ratingSummary(initialState().reviews)).toEqual({ count: 0, average: null });
  });
});

describe("verification", () => {
  it("never marks verified without a performed check", () => {
    const s = initialState();
    expect(() => e.decideVerification(s, "a5", "verified", [], "", ctx)).toThrow();
    const t = e.decideVerification(s, "a5", "verified", ["phone", "id"], "", ctx);
    expect(t.artisans.find((a) => a.id === "a5")!.verification.checks).toEqual(["phone", "id"]);
  });
});

describe("search", () => {
  it("finds plumbers that serve the chosen area only", () => {
    const s = initialState();
    const yaba = searchArtisans(s, { trade: "plumbing", areaId: "lagos-yaba" });
    expect(yaba.length).toBeGreaterThan(0);
    expect(yaba.every((a) => a.trade === "plumbing" && a.areaIds.includes("lagos-yaba"))).toBe(true);
    expect(searchArtisans(s, { trade: "plumbing", areaId: "abuja-kubwa" })).toHaveLength(0);
  });
  it("puts verified artisans first and can filter to verified", () => {
    const s = initialState();
    const all = searchArtisans(s, { trade: "tailoring", city: "Lagos" });
    expect(all[0].verification.status).toBe("verified");
    expect(searchArtisans(s, { trade: "tailoring", city: "Lagos", verifiedOnly: true }).every((a) => a.verification.status === "verified")).toBe(true);
  });
});
