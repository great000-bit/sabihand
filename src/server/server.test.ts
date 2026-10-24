import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AppState, Artisan, Booking, Viewer } from "@/lib/types";

// repo.ts imports the database client; these tests only exercise the pure redaction rules.
vi.mock("./db", () => ({ sql: () => { throw new Error("no database in unit tests"); }, dbConfigured: false }));
const { visibleTo } = await import("./repo");
const { validSignature } = await import("./paystack");

const v = (id: string, isAdmin = false): Viewer => ({ id, name: id, email: `${id}@x.com`, isAdmin });
const artisan: Artisan = {
  id: "a1", ownerId: "owner", name: "Tunde", businessName: "T Co", phone: "+2348031111111", trade: "electrical", areaIds: ["lagos-yaba"], bio: "", availability: "",
  services: [{ title: "s", minKobo: 100, maxKobo: null }], portfolio: [], verification: { status: "rejected", checks: [], note: "ID did not match" }, joinedAt: "x",
};
const booking = (over: Partial<Booking> = {}): Booking => ({
  id: "b1", artisanId: "a1", customerId: "cust", customerName: "Ada", customerPhone: "+2348032222222", trade: "electrical", areaId: "lagos-yaba", title: "t", description: "d",
  preferredDate: "x", status: "pending_response", createdAt: "x", events: [], ...over,
});
const state = (over: Partial<AppState> = {}): AppState => ({
  artisans: [artisan], bookings: [booking()], payments: [], reviews: [
    { id: "r1", bookingId: "b1", artisanId: "a1", customerName: "Ada", rating: 5, text: "", createdAt: "x" },
    { id: "r2", bookingId: "b2", artisanId: "a1", customerName: "Bo", rating: 1, text: "", createdAt: "x", hidden: true },
  ],
  reports: [{ id: "rp", kind: "booking", targetId: "b1", reason: "x", reporterName: "Ada", createdAt: "x" }], ...over,
});
const paid = { id: "p1", bookingId: "b1", amountKobo: 100, commissionKobo: 10, status: "held" as const, provider: "paystack" as const, providerRef: "r", createdAt: "x" };

describe("what each person receives", () => {
  it("shows a stranger public profiles only: no phones, owner ids, notes, bookings, reports or hidden reviews", () => {
    const out = visibleTo(state(), v("stranger"));
    expect(out.artisans[0]).toMatchObject({ phone: "", ownerId: "" });
    expect(out.artisans[0].verification.note).toBeUndefined();
    expect(out.bookings).toHaveLength(0);
    expect(out.reports).toHaveLength(0);
    expect(out.reviews.map((r) => r.id)).toEqual(["r1"]);
    expect(visibleTo(state(), null).bookings).toHaveLength(0);
  });
  it("keeps phone numbers private until the booking is paid, for both sides", () => {
    const before = state();
    expect(visibleTo(before, v("cust")).artisans[0].phone).toBe("");
    expect(visibleTo(before, v("owner")).bookings[0].customerPhone).toBe("");
    const after = state({ payments: [paid] });
    expect(visibleTo(after, v("cust")).artisans[0].phone).toBe("+2348031111111");
    expect(visibleTo(after, v("owner")).bookings[0].customerPhone).toBe("+2348032222222");
    expect(visibleTo(after, v("stranger")).artisans[0].phone).toBe("");
  });
  it("shows the owner their own profile in full, and the admin everything", () => {
    const own = visibleTo(state(), v("owner"));
    expect(own.artisans[0]).toMatchObject({ ownerId: "owner", phone: "+2348031111111" });
    expect(own.artisans[0].verification.note).toBe("ID did not match");
    expect(own.reports).toHaveLength(0);
    const admin = visibleTo(state(), v("boss", true));
    expect(admin.bookings).toHaveLength(1);
    expect(admin.reports).toHaveLength(1);
    expect(admin.reviews).toHaveLength(2);
  });
  it("keeps bank details to the owner and the admin", () => {
    const withBank = state({ artisans: [{ ...artisan, bank: { bankName: "GTBank", accountNumber: "0123456789", accountName: "Tunde" } }] });
    expect(visibleTo(withBank, v("stranger")).artisans[0].bank).toBeUndefined();
    expect(visibleTo(withBank, v("cust")).artisans[0].bank).toBeUndefined();
    expect(visibleTo(withBank, v("owner")).artisans[0].bank?.accountNumber).toBe("0123456789");
    expect(visibleTo(withBank, v("boss", true)).artisans[0].bank?.accountNumber).toBe("0123456789");
  });
  it("does not leak another customer's booking", () => {
    expect(visibleTo(state(), v("other-customer")).bookings).toHaveLength(0);
  });
});

describe("paystack webhook signature", () => {
  it("accepts only an HMAC SHA512 of the raw body made with the secret", () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_x";
    const body = JSON.stringify({ event: "charge.success" });
    const sig = createHmac("sha512", "sk_test_x").update(body).digest("hex");
    expect(validSignature(body, sig)).toBe(true);
    expect(validSignature(body + " ", sig)).toBe(false);
    expect(validSignature(body, null)).toBe(false);
    expect(validSignature(body, "abc")).toBe(false);
  });
});
