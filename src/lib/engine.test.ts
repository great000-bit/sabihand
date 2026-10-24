import { describe, expect, it } from "vitest";
import * as e from "./engine";
import { commissionKobo, artisanPayoutKobo, formatNaira, formatPriceRange, nairaToKobo } from "./money";
import { canTransition } from "./booking";
import { ratingSummary } from "./reviews";
import { searchArtisans } from "./search";
import { normalisePhone } from "./phone";
import type { AppState, Artisan, Viewer } from "./types";

let n = 0;
const base = { now: "2026-10-25T10:00:00.000Z", id: (p: string) => `${p}${++n}` };

const customer: Viewer = { id: "u-cust", name: "Ada Obi", email: "ada@example.com", isAdmin: false };
const owner: Viewer = { id: "u-art", name: "Tunde Bello", email: "tunde@example.com", isAdmin: false };
const stranger: Viewer = { id: "u-other", name: "Chidi", email: "chidi@example.com", isAdmin: false };
const admin: Viewer = { id: "u-admin", name: "Admin", email: "admin@example.com", isAdmin: true };
const as = (user: Viewer) => ({ ...base, user });

function artisan(over: Partial<Artisan> = {}): Artisan {
  return {
    id: "a1",
    ownerId: owner.id,
    name: "Tunde Bello",
    businessName: "Bello Electricals",
    phone: "+2348031234567",
    trade: "electrical",
    areaIds: ["lagos-yaba", "lagos-surulere"],
    bio: "",
    availability: "Mon to Sat",
    services: [{ title: "Fix a socket", minKobo: nairaToKobo(5000), maxKobo: nairaToKobo(15000) }],
    portfolio: [],
    verification: { status: "unverified", checks: [] },
    joinedAt: base.now,
    ...over,
  };
}

const empty = (artisans: Artisan[] = [artisan()]): AppState => ({ artisans, bookings: [], payments: [], reviews: [], reports: [] });
const request = { artisanId: "a1", areaId: "lagos-yaba", title: "Fix socket", description: "Two sockets in the lounge are dead", preferredDate: "2026-10-30", phone: "0803 123 4567" };

/** Request, quote, accept, and a confirmed provider payment. */
function bookedJob() {
  let s = e.createRequest(empty(), request, as(customer));
  const id = s.bookings[0].id;
  s = e.sendQuote(s, id, { amountKobo: nairaToKobo(12500), description: "Replace two sockets", proposedDate: "2026-10-30" }, as(owner));
  s = e.acceptQuote(s, id, as(customer));
  s = e.recordPayment(s, id, { providerRef: "ref-1", amountKobo: nairaToKobo(12500) }, base);
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

describe("phone numbers", () => {
  it("accepts Nigerian mobiles in common spellings and rejects the rest", () => {
    expect(normalisePhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalisePhone("+234 803 123 4567")).toBe("+2348031234567");
    expect(normalisePhone("2348031234567")).toBe("+2348031234567");
    expect(normalisePhone("12345")).toBeNull();
    expect(normalisePhone("0603 123 4567")).toBeNull();
  });
});

describe("requests", () => {
  it("creates a request owned by the signed-in customer", () => {
    const s = e.createRequest(empty(), request, as(customer));
    expect(s.bookings[0]).toMatchObject({ customerId: customer.id, customerName: "Ada Obi", customerPhone: "+2348031234567", status: "pending_response" });
  });
  it("blocks booking yourself, bad phones, thin descriptions and unserved areas", () => {
    expect(() => e.createRequest(empty(), request, as(owner))).toThrow(/own profile/);
    expect(() => e.createRequest(empty(), { ...request, phone: "abc" }, as(customer))).toThrow(/mobile number/);
    expect(() => e.createRequest(empty(), { ...request, description: "short" }, as(customer))).toThrow();
    expect(() => e.createRequest(empty(), { ...request, areaId: "abuja-wuse" }, as(customer))).toThrow(/does not serve/);
  });
});

describe("booking flow", () => {
  it("holds payment, then releases it when the customer confirms", () => {
    const { s, id } = bookedJob();
    expect(s.bookings[0].status).toBe("confirmed");
    expect(s.payments[0]).toMatchObject({ status: "held", provider: "paystack", providerRef: "ref-1", commissionKobo: nairaToKobo(1250) });
    let t = e.startJob(s, id, as(owner));
    t = e.markDone(t, id, as(owner));
    t = e.confirmDone(t, id, as(customer));
    expect(t.bookings[0].status).toBe("completed");
    expect(t.payments[0].status).toBe("released");
  });
  it("refunds a held payment when cancelled", () => {
    const { s, id } = bookedJob();
    expect(e.cancelBooking(s, id, as(customer)).payments[0].status).toBe("refunded");
  });
  it("blocks illegal moves", () => {
    expect(canTransition("pending_response", "completed", "customer")).toBe(false);
    expect(canTransition("pending_response", "accepted", "customer")).toBe(false);
    expect(canTransition("disputed", "completed", "admin")).toBe(true);
  });
  it("requires a reason to dispute, and only an admin settles the money", () => {
    const { s, id } = bookedJob();
    expect(() => e.raiseDispute(s, id, " ", as(customer))).toThrow();
    let t = e.raiseDispute(s, id, "Artisan did not show up", as(customer));
    expect(t.reports[0].reporterName).toBe("Ada Obi");
    expect(() => e.resolveDispute(t, id, "refund", "x", as(customer))).toThrow();
    t = e.resolveDispute(t, id, "refund", "Refunded after no-show", as(admin));
    expect(t.payments[0].status).toBe("refunded");
    expect(t.reports[0].resolvedAt).toBeDefined();
  });
});

describe("who may do what", () => {
  it("lets only the artisan quote, start and mark done, and only the customer accept, confirm and review", () => {
    let s = e.createRequest(empty(), request, as(customer));
    const id = s.bookings[0].id;
    const quote = { amountKobo: nairaToKobo(9000), description: "Labour", proposedDate: "2026-10-30" };
    expect(() => e.sendQuote(s, id, quote, as(customer))).toThrow(/cannot do that/);
    expect(() => e.sendQuote(s, id, quote, as(stranger))).toThrow(/cannot do that/);
    s = e.sendQuote(s, id, quote, as(owner));
    expect(() => e.acceptQuote(s, id, as(owner))).toThrow(/cannot do that/);
    expect(() => e.acceptQuote(s, id, as(stranger))).toThrow(/cannot do that/);
    s = e.acceptQuote(s, id, as(customer));
    s = e.recordPayment(s, id, { providerRef: "r2", amountKobo: nairaToKobo(9000) }, base);
    expect(() => e.startJob(s, id, as(customer))).toThrow(/cannot do that/);
    s = e.startJob(s, id, as(owner));
    expect(() => e.confirmDone(s, id, as(owner))).toThrow(/cannot do that/);
    expect(() => e.cancelBooking(s, id, as(stranger))).toThrow(/cannot do that/);
  });
});

describe("payments", () => {
  it("only records a payment that matches the accepted quote", () => {
    let s = e.createRequest(empty(), request, as(customer));
    const id = s.bookings[0].id;
    s = e.sendQuote(s, id, { amountKobo: nairaToKobo(9000), description: "Labour", proposedDate: "2026-10-30" }, as(owner));
    expect(() => e.recordPayment(s, id, { providerRef: "r", amountKobo: nairaToKobo(9000) }, base)).toThrow(/not waiting for payment/);
    s = e.acceptQuote(s, id, as(customer));
    expect(() => e.recordPayment(s, id, { providerRef: "r", amountKobo: nairaToKobo(100) }, base)).toThrow(/does not match/);
  });
  it("is idempotent for the same provider reference, so callback and webhook cannot double charge", () => {
    const { s, id } = bookedJob();
    expect(e.recordPayment(s, id, { providerRef: "ref-1", amountKobo: nairaToKobo(12500) }, base)).toBe(s);
    expect(() => e.recordPayment(s, id, { providerRef: "ref-2", amountKobo: nairaToKobo(12500) }, base)).toThrow(/not waiting for payment/);
  });
});

describe("reviews", () => {
  it("only after completion, by the customer, once per job", () => {
    const { s, id } = bookedJob();
    expect(() => e.submitReview(s, id, 5, "great", as(customer))).toThrow();
    let t = e.confirmDone(e.startJob(s, id, as(owner)), id, as(customer));
    expect(() => e.submitReview(t, id, 5, "great", as(owner))).toThrow(/cannot do that/);
    t = e.submitReview(t, id, 4, "Good work", as(customer));
    expect(() => e.submitReview(t, id, 5, "again", as(customer))).toThrow();
    expect(ratingSummary(t.reviews)).toEqual({ count: 1, average: 4 });
    expect(ratingSummary([])).toEqual({ count: 0, average: null });
  });
  it("lets only the reviewed artisan report a review, and only an admin moderate it", () => {
    const { s, id } = bookedJob();
    let t = e.confirmDone(e.startJob(s, id, as(owner)), id, as(customer));
    t = e.submitReview(t, id, 1, "Bad", as(customer));
    const rv = t.reviews[0].id;
    expect(() => e.reportReview(t, rv, "unfair", as(stranger))).toThrow();
    t = e.reportReview(t, rv, "This job never happened", as(owner));
    expect(() => e.moderateReview(t, t.reports[0].id, true, as(owner))).toThrow(/cannot do that/);
    t = e.moderateReview(t, t.reports[0].id, true, as(admin));
    expect(ratingSummary(t.reviews)).toEqual({ count: 0, average: null });
  });
});

describe("artisan profiles and verification", () => {
  const input = { name: "Ngozi A", businessName: "Ngozi Tailoring", phone: "08031234567", trade: "tailoring" as const, areaIds: ["abuja-wuse"], bio: "", availability: "", service: { title: "Alterations", minNaira: 3000, maxNaira: null } };
  it("registers one profile per person, with a valid phone and price", () => {
    const s = e.registerArtisan(empty([]), input, as(stranger));
    expect(s.artisans[0]).toMatchObject({ ownerId: stranger.id, phone: "+2348031234567", verification: { status: "unverified", checks: [] } });
    expect(() => e.registerArtisan(s, input, as(stranger))).toThrow(/already have/);
    expect(() => e.registerArtisan(empty([]), { ...input, phone: "1" }, as(stranger))).toThrow(/mobile number/);
    expect(() => e.registerArtisan(empty([]), { ...input, service: { title: "x", minNaira: 5000, maxNaira: 100 } }, as(stranger))).toThrow(/cannot be below/);
  });
  it("only the owner submits, only an admin decides, and never verifies without a performed check", () => {
    const s = empty();
    expect(() => e.submitVerification(s, "a1", as(stranger))).toThrow();
    const pending = e.submitVerification(s, "a1", as(owner));
    expect(pending.artisans[0].verification.status).toBe("pending");
    expect(() => e.decideVerification(pending, "a1", "verified", ["phone"], "", as(owner))).toThrow();
    expect(() => e.decideVerification(pending, "a1", "verified", [], "", as(admin))).toThrow();
    const done = e.decideVerification(pending, "a1", "verified", ["phone", "id"], "", as(admin));
    expect(done.artisans[0].verification).toMatchObject({ status: "verified", checks: ["phone", "id"] });
  });
});

describe("payouts", () => {
  const bank = { bankName: "GTBank", accountNumber: "0123 456 789", accountName: "Tunde Bello" };
  it("lets only the owner save valid bank details", () => {
    const s = e.saveBankDetails(empty(), "a1", bank, as(owner));
    expect(s.artisans[0].bank).toEqual({ bankName: "GTBank", accountNumber: "0123456789", accountName: "Tunde Bello" });
    expect(() => e.saveBankDetails(empty(), "a1", bank, as(stranger))).toThrow(/cannot do that/);
    expect(() => e.saveBankDetails(empty(), "a1", { ...bank, accountNumber: "123" }, as(owner))).toThrow(/10 digits/);
  });
  it("lets only an admin record a payout, once, and only after release", () => {
    const { s, id } = bookedJob();
    const pid = s.payments[0].id;
    expect(() => e.markPaidOut(s, pid, "TRF-1", as(admin))).toThrow(/released/);
    const released = e.confirmDone(e.startJob(s, id, as(owner)), id, as(customer));
    expect(() => e.markPaidOut(released, pid, "TRF-1", as(owner))).toThrow(/cannot do that/);
    expect(() => e.markPaidOut(released, pid, " ", as(admin))).toThrow(/reference/);
    const paid = e.markPaidOut(released, pid, "TRF-1", as(admin));
    expect(paid.payments[0].payout).toMatchObject({ reference: "TRF-1" });
    expect(() => e.markPaidOut(paid, pid, "TRF-2", as(admin))).toThrow(/already/);
  });
});

describe("search", () => {
  const list = [
    artisan({ id: "a1", businessName: "Bello Electricals", verification: { status: "verified", checks: ["phone"] } }),
    artisan({ id: "a2", ownerId: "x2", businessName: "Adams Electric", areaIds: ["lagos-yaba"] }),
    artisan({ id: "a3", ownerId: "x3", businessName: "Kubwa Sparks", areaIds: ["abuja-kubwa"] }),
    artisan({ id: "a4", ownerId: "x4", businessName: "Rejected Co", verification: { status: "rejected", checks: [] } }),
  ];
  const s = { artisans: list, reviews: [] };
  it("returns only artisans that serve the chosen area and hides rejected ones", () => {
    const ids = searchArtisans(s, { trade: "electrical", areaId: "lagos-yaba" }).map((a) => a.id);
    expect(ids).toEqual(["a1", "a2"]);
    expect(searchArtisans(s, { trade: "plumbing" })).toHaveLength(0);
    expect(searchArtisans(s, { city: "Abuja" }).map((a) => a.id)).toEqual(["a3"]);
  });
  it("puts verified artisans first and can filter to verified", () => {
    expect(searchArtisans(s, { trade: "electrical" })[0].id).toBe("a1");
    expect(searchArtisans(s, { trade: "electrical", verifiedOnly: true }).map((a) => a.id)).toEqual(["a1"]);
  });
});
