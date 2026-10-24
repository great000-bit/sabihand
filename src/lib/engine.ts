import type { AppState, Artisan, Booking, BookingStatus, Payment, Report, Review, Role, Trade, VerificationCheck } from "./types";
import { transition } from "./booking";
import { commissionKobo } from "./money";

export interface Ctx {
  now: string;
  id: (prefix: string) => string;
}

function mustFind<T extends { id: string }>(list: T[], id: string, what: string): T {
  const x = list.find((i) => i.id === id);
  if (!x) throw new Error(`${what} not found`);
  return x;
}

function replace<T extends { id: string }>(list: T[], next: T): T[] {
  return list.map((i) => (i.id === next.id ? next : i));
}

function move(state: AppState, bookingId: string, to: BookingStatus, role: Role, ctx: Ctx, note?: string, patch?: Partial<Booking>): AppState {
  const b = mustFind(state.bookings, bookingId, "Booking");
  const next = { ...transition(b, to, role, ctx.now, note), ...patch };
  return { ...state, bookings: replace(state.bookings, next) };
}

export function createRequest(
  state: AppState,
  input: { artisanId: string; trade: Trade; areaId: string; title: string; description: string; preferredDate: string },
  ctx: Ctx,
): AppState {
  const a = mustFind(state.artisans, input.artisanId, "Artisan");
  if (!input.title.trim()) throw new Error("Add a short title for the job");
  if (input.description.trim().length < 10) throw new Error("Describe the job in a few words so the artisan can quote");
  if (!a.areaIds.includes(input.areaId)) throw new Error("This artisan does not serve that area");
  const booking: Booking = {
    id: ctx.id("b"),
    artisanId: a.id,
    customerId: "c-demo",
    customerName: state.customerName,
    trade: a.trade,
    areaId: input.areaId,
    title: input.title.trim(),
    description: input.description.trim(),
    preferredDate: input.preferredDate,
    status: "pending_response",
    createdAt: ctx.now,
    events: [{ at: ctx.now, actor: "customer", from: null, to: "pending_response" }],
  };
  return { ...state, bookings: [booking, ...state.bookings] };
}

export function sendQuote(state: AppState, bookingId: string, q: { amountKobo: number; description: string; proposedDate: string }, ctx: Ctx): AppState {
  if (!Number.isInteger(q.amountKobo) || q.amountKobo <= 0) throw new Error("Enter a price greater than zero");
  if (!q.description.trim()) throw new Error("Say what the price covers");
  return move(state, bookingId, "accepted", "artisan", ctx, "Quote sent", {
    quote: { amountKobo: q.amountKobo, description: q.description.trim(), proposedDate: q.proposedDate, sentAt: ctx.now },
  });
}

export function declineRequest(state: AppState, bookingId: string, ctx: Ctx, note?: string): AppState {
  return move(state, bookingId, "declined", "artisan", ctx, note);
}

export function acceptQuote(state: AppState, bookingId: string, ctx: Ctx): AppState {
  const b = mustFind(state.bookings, bookingId, "Booking");
  if (!b.quote) throw new Error("There is no quote to accept");
  return move(state, bookingId, "awaiting_payment", "customer", ctx, "Quote accepted");
}

/** Demo provider only: records a held payment. A real provider must confirm server-side before this runs. */
export function payAndHold(state: AppState, bookingId: string, ctx: Ctx): AppState {
  const b = mustFind(state.bookings, bookingId, "Booking");
  if (!b.quote) throw new Error("There is no quote to pay");
  if (state.payments.some((p) => p.bookingId === bookingId && p.status === "held")) throw new Error("This booking is already paid");
  const payment: Payment = {
    id: ctx.id("p"),
    bookingId,
    amountKobo: b.quote.amountKobo,
    commissionKobo: commissionKobo(b.quote.amountKobo),
    status: "held",
    provider: "demo",
    createdAt: ctx.now,
  };
  const s = move(state, bookingId, "confirmed", "customer", ctx, "Payment held");
  return { ...s, payments: [...s.payments, payment] };
}

export function startJob(state: AppState, bookingId: string, ctx: Ctx): AppState {
  return move(state, bookingId, "in_progress", "artisan", ctx);
}

export function markDone(state: AppState, bookingId: string, ctx: Ctx): AppState {
  const b = mustFind(state.bookings, bookingId, "Booking");
  if (b.status !== "in_progress") throw new Error("Start the job before marking it done");
  return { ...state, bookings: replace(state.bookings, { ...b, artisanMarkedDoneAt: ctx.now, events: [...b.events, { at: ctx.now, actor: "artisan", from: b.status, to: b.status, note: "Marked the job as done" }] }) };
}

function settle(state: AppState, bookingId: string, status: "released" | "refunded", ctx: Ctx): AppState {
  return { ...state, payments: state.payments.map((p) => (p.bookingId === bookingId && p.status === "held" ? { ...p, status, settledAt: ctx.now } : p)) };
}

export function confirmDone(state: AppState, bookingId: string, ctx: Ctx): AppState {
  const s = move(state, bookingId, "completed", "customer", ctx, "Customer confirmed the job");
  return settle(s, bookingId, "released", ctx);
}

export function cancelBooking(state: AppState, bookingId: string, role: "customer" | "artisan", ctx: Ctx, note?: string): AppState {
  const s = move(state, bookingId, "cancelled", role, ctx, note);
  return settle(s, bookingId, "refunded", ctx);
}

export function raiseDispute(state: AppState, bookingId: string, role: "customer" | "artisan", reason: string, ctx: Ctx): AppState {
  if (!reason.trim()) throw new Error("Tell us what went wrong");
  const s = move(state, bookingId, "disputed", role, ctx, reason.trim());
  const report: Report = { id: ctx.id("r"), kind: "booking", targetId: bookingId, reason: reason.trim(), reporterName: role === "customer" ? state.customerName : "Artisan", createdAt: ctx.now };
  return { ...s, reports: [report, ...s.reports] };
}

export function resolveDispute(state: AppState, bookingId: string, outcome: "release" | "refund", resolution: string, ctx: Ctx): AppState {
  let s = move(state, bookingId, outcome === "release" ? "completed" : "cancelled", "admin", ctx, resolution);
  s = settle(s, bookingId, outcome === "release" ? "released" : "refunded", ctx);
  return { ...s, reports: s.reports.map((r) => (r.kind === "booking" && r.targetId === bookingId && !r.resolvedAt ? { ...r, resolvedAt: ctx.now, resolution } : r)) };
}

export function submitReview(state: AppState, bookingId: string, rating: number, text: string, ctx: Ctx): AppState {
  const b = mustFind(state.bookings, bookingId, "Booking");
  if (b.status !== "completed") throw new Error("You can review a job once it is completed");
  if (state.reviews.some((r) => r.bookingId === bookingId)) throw new Error("This job already has a review");
  if (![1, 2, 3, 4, 5].includes(rating)) throw new Error("Choose a rating from 1 to 5");
  const review: Review = { id: ctx.id("rv"), bookingId, artisanId: b.artisanId, customerName: b.customerName, rating: rating as Review["rating"], text: text.trim(), createdAt: ctx.now };
  return { ...state, reviews: [review, ...state.reviews] };
}

export function reportReview(state: AppState, reviewId: string, reason: string, ctx: Ctx): AppState {
  mustFind(state.reviews, reviewId, "Review");
  if (!reason.trim()) throw new Error("Say why you are reporting this review");
  return { ...state, reports: [{ id: ctx.id("r"), kind: "review", targetId: reviewId, reason: reason.trim(), reporterName: "Artisan", createdAt: ctx.now }, ...state.reports] };
}

export function moderateReview(state: AppState, reportId: string, hide: boolean, ctx: Ctx): AppState {
  const r = mustFind(state.reports, reportId, "Report");
  if (r.kind !== "review") throw new Error("Not a review report");
  return {
    ...state,
    reviews: state.reviews.map((rv) => (rv.id === r.targetId ? { ...rv, hidden: hide } : rv)),
    reports: state.reports.map((x) => (x.id === reportId ? { ...x, resolvedAt: ctx.now, resolution: hide ? "Review hidden" : "Review kept" } : x)),
  };
}

export function submitVerification(state: AppState, artisanId: string, ctx: Ctx): AppState {
  const a = mustFind(state.artisans, artisanId, "Artisan");
  return { ...state, artisans: replace(state.artisans, { ...a, verification: { ...a.verification, status: "pending", submittedAt: ctx.now, note: undefined } }) };
}

export function decideVerification(
  state: AppState,
  artisanId: string,
  decision: "verified" | "rejected",
  checks: VerificationCheck[],
  note: string,
  ctx: Ctx,
): AppState {
  const a = mustFind(state.artisans, artisanId, "Artisan");
  if (decision === "verified" && checks.length === 0) throw new Error("Tick at least one check you actually performed");
  const verification = { ...a.verification, status: decision, checks: decision === "verified" ? checks : [], decidedAt: ctx.now, note: note.trim() || undefined };
  return { ...state, artisans: replace(state.artisans, { ...a, verification }) };
}

export function registerArtisan(
  state: AppState,
  input: { name: string; businessName: string; trade: Trade; areaIds: string[]; bio: string; availability: string; service: { title: string; minNaira: number; maxNaira: number | null } },
  ctx: Ctx,
): AppState {
  if (!input.name.trim() || !input.businessName.trim()) throw new Error("Add your name and business name");
  if (input.areaIds.length === 0) throw new Error("Choose at least one area you serve");
  if (!input.service.title.trim() || input.service.minNaira <= 0) throw new Error("Add one service with a starting price");
  const a: Artisan = {
    id: ctx.id("a"),
    name: input.name.trim(),
    businessName: input.businessName.trim(),
    trade: input.trade,
    areaIds: input.areaIds,
    bio: input.bio.trim(),
    availability: input.availability.trim() || "Ask the artisan",
    services: [{ title: input.service.title.trim(), minKobo: Math.round(input.service.minNaira * 100), maxKobo: input.service.maxNaira ? Math.round(input.service.maxNaira * 100) : null }],
    portfolio: [],
    verification: { status: "unverified", checks: [] },
    joinedAt: ctx.now,
    isSample: false,
  };
  return { ...state, artisans: [...state.artisans, a], activeArtisanId: a.id, role: "artisan" };
}
