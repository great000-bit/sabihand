import type { AppState, Artisan, Booking, BookingStatus, Payment, Report, Review, Role, Trade, VerificationCheck, Viewer } from "./types";
import { transition } from "./booking";
import { actorOn } from "./access";
import { commissionKobo } from "./money";
import { normalisePhone } from "./phone";
import { MAX_AREAS, TRADES, areaById } from "./catalog";

/**
 * Every function takes the current state and returns the next one, or throws an Error whose
 * message is safe to show to a person. Who is acting (`ctx.user`) is checked here, not in the UI.
 */
export interface Ctx {
  now: string;
  id: (prefix: string) => string;
  user: Viewer;
}

const DENIED = "You cannot do that on this request.";

function mustFind<T extends { id: string }>(list: T[], id: string, what: string): T {
  const x = list.find((i) => i.id === id);
  if (!x) throw new Error(`${what} not found`);
  return x;
}

function replace<T extends { id: string }>(list: T[], next: T): T[] {
  return list.map((i) => (i.id === next.id ? next : i));
}

/** The booking plus the side the acting user is on; throws unless that side is allowed. */
function as(state: AppState, bookingId: string, ctx: Ctx, allowed: Role[]): { booking: Booking; role: Role } {
  const booking = mustFind(state.bookings, bookingId, "Request");
  const role = actorOn(state, booking, ctx.user);
  if (!role || !allowed.includes(role)) throw new Error(DENIED);
  return { booking, role };
}

function move(state: AppState, bookingId: string, to: BookingStatus, role: Role, ctx: Pick<Ctx, "now">, note?: string, patch?: Partial<Booking>): AppState {
  const b = mustFind(state.bookings, bookingId, "Request");
  const next = { ...transition(b, to, role, ctx.now, note), ...patch };
  return { ...state, bookings: replace(state.bookings, next) };
}

export function createRequest(
  state: AppState,
  input: { artisanId: string; areaId: string; title: string; description: string; preferredDate: string; phone: string },
  ctx: Ctx,
): AppState {
  const a = mustFind(state.artisans, input.artisanId, "Artisan");
  if (a.ownerId === ctx.user.id) throw new Error("You cannot book your own profile.");
  if (a.verification.status === "rejected") throw new Error("This artisan is not taking requests.");
  const phone = normalisePhone(input.phone);
  if (!phone) throw new Error("Enter a Nigerian mobile number the artisan can reach you on, like 0803 123 4567.");
  if (!input.title.trim()) throw new Error("Add a short title for the job.");
  if (input.description.trim().length < 10) throw new Error("Describe the job in a few words so the artisan can quote.");
  if (!a.areaIds.includes(input.areaId)) throw new Error("This artisan does not serve that area.");
  const booking: Booking = {
    id: ctx.id("b"),
    artisanId: a.id,
    customerId: ctx.user.id,
    customerName: ctx.user.name,
    customerPhone: phone,
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
  as(state, bookingId, ctx, ["artisan"]);
  if (!Number.isInteger(q.amountKobo) || q.amountKobo <= 0) throw new Error("Enter a price greater than zero.");
  if (!q.description.trim()) throw new Error("Say what the price covers.");
  return move(state, bookingId, "accepted", "artisan", ctx, "Quote sent", {
    quote: { amountKobo: q.amountKobo, description: q.description.trim(), proposedDate: q.proposedDate, sentAt: ctx.now },
  });
}

export function declineRequest(state: AppState, bookingId: string, ctx: Ctx, note?: string): AppState {
  as(state, bookingId, ctx, ["artisan"]);
  return move(state, bookingId, "declined", "artisan", ctx, note);
}

export function acceptQuote(state: AppState, bookingId: string, ctx: Ctx): AppState {
  const { booking } = as(state, bookingId, ctx, ["customer"]);
  if (!booking.quote) throw new Error("There is no quote to accept.");
  return move(state, bookingId, "awaiting_payment", "customer", ctx, "Quote accepted");
}

/**
 * System call, made only after the payment provider has confirmed the charge server-side (callback or webhook).
 * Idempotent: the same provider reference never creates a second payment.
 */
export function recordPayment(state: AppState, bookingId: string, paid: { providerRef: string; amountKobo: number }, ctx: Pick<Ctx, "now" | "id">): AppState {
  const b = mustFind(state.bookings, bookingId, "Request");
  if (state.payments.some((p) => p.providerRef === paid.providerRef)) return state;
  if (!b.quote) throw new Error("There is no quote to pay.");
  if (b.status !== "awaiting_payment") throw new Error("This request is not waiting for payment.");
  if (paid.amountKobo !== b.quote.amountKobo) throw new Error("The amount paid does not match the quote.");
  const payment: Payment = {
    id: ctx.id("p"),
    bookingId,
    amountKobo: paid.amountKobo,
    commissionKobo: commissionKobo(paid.amountKobo),
    status: "held",
    provider: "paystack",
    providerRef: paid.providerRef,
    createdAt: ctx.now,
  };
  const s = move(state, bookingId, "confirmed", "customer", ctx, "Payment received and held");
  return { ...s, payments: [...s.payments, payment] };
}

export function startJob(state: AppState, bookingId: string, ctx: Ctx): AppState {
  as(state, bookingId, ctx, ["artisan"]);
  return move(state, bookingId, "in_progress", "artisan", ctx);
}

export function markDone(state: AppState, bookingId: string, ctx: Ctx): AppState {
  const { booking: b } = as(state, bookingId, ctx, ["artisan"]);
  if (b.status !== "in_progress") throw new Error("Start the job before marking it done.");
  const event = { at: ctx.now, actor: "artisan" as const, from: b.status, to: b.status, note: "Marked the job as done" };
  return { ...state, bookings: replace(state.bookings, { ...b, artisanMarkedDoneAt: ctx.now, events: [...b.events, event] }) };
}

function settle(state: AppState, bookingId: string, status: "released" | "refunded", ctx: Pick<Ctx, "now">): AppState {
  return { ...state, payments: state.payments.map((p) => (p.bookingId === bookingId && p.status === "held" ? { ...p, status, settledAt: ctx.now } : p)) };
}

export function confirmDone(state: AppState, bookingId: string, ctx: Ctx): AppState {
  as(state, bookingId, ctx, ["customer"]);
  const s = move(state, bookingId, "completed", "customer", ctx, "Customer confirmed the job");
  return settle(s, bookingId, "released", ctx);
}

export function cancelBooking(state: AppState, bookingId: string, ctx: Ctx, note?: string): AppState {
  const { role } = as(state, bookingId, ctx, ["customer", "artisan"]);
  const s = move(state, bookingId, "cancelled", role, ctx, note);
  return settle(s, bookingId, "refunded", ctx);
}

export function raiseDispute(state: AppState, bookingId: string, reason: string, ctx: Ctx): AppState {
  const { role } = as(state, bookingId, ctx, ["customer", "artisan"]);
  if (!reason.trim()) throw new Error("Tell us what went wrong.");
  const s = move(state, bookingId, "disputed", role, ctx, reason.trim());
  const report: Report = { id: ctx.id("r"), kind: "booking", targetId: bookingId, reason: reason.trim(), reporterName: ctx.user.name, createdAt: ctx.now };
  return { ...s, reports: [report, ...s.reports] };
}

export function resolveDispute(state: AppState, bookingId: string, outcome: "release" | "refund", resolution: string, ctx: Ctx): AppState {
  if (!ctx.user.isAdmin) throw new Error(DENIED);
  let s = move(state, bookingId, outcome === "release" ? "completed" : "cancelled", "admin", ctx, resolution);
  s = settle(s, bookingId, outcome === "release" ? "released" : "refunded", ctx);
  return { ...s, reports: s.reports.map((r) => (r.kind === "booking" && r.targetId === bookingId && !r.resolvedAt ? { ...r, resolvedAt: ctx.now, resolution } : r)) };
}

export function submitReview(state: AppState, bookingId: string, rating: number, text: string, ctx: Ctx): AppState {
  const { booking: b } = as(state, bookingId, ctx, ["customer"]);
  if (b.status !== "completed") throw new Error("You can review a job once it is completed.");
  if (state.reviews.some((r) => r.bookingId === bookingId)) throw new Error("This job already has a review.");
  if (![1, 2, 3, 4, 5].includes(rating)) throw new Error("Choose a rating from 1 to 5.");
  const review: Review = { id: ctx.id("rv"), bookingId, artisanId: b.artisanId, customerName: b.customerName, rating: rating as Review["rating"], text: text.trim(), createdAt: ctx.now };
  return { ...state, reviews: [review, ...state.reviews] };
}

export function reportReview(state: AppState, reviewId: string, reason: string, ctx: Ctx): AppState {
  const review = mustFind(state.reviews, reviewId, "Review");
  const owner = mustFind(state.artisans, review.artisanId, "Artisan").ownerId;
  if (owner !== ctx.user.id) throw new Error("Only the artisan who was reviewed can report a review.");
  if (!reason.trim()) throw new Error("Say why you are reporting this review.");
  if (state.reports.some((r) => r.kind === "review" && r.targetId === reviewId && !r.resolvedAt)) throw new Error("This review is already reported.");
  return { ...state, reports: [{ id: ctx.id("r"), kind: "review", targetId: reviewId, reason: reason.trim(), reporterName: ctx.user.name, createdAt: ctx.now }, ...state.reports] };
}

export function moderateReview(state: AppState, reportId: string, hide: boolean, ctx: Ctx): AppState {
  if (!ctx.user.isAdmin) throw new Error(DENIED);
  const r = mustFind(state.reports, reportId, "Report");
  if (r.kind !== "review") throw new Error("Not a review report.");
  return {
    ...state,
    reviews: state.reviews.map((rv) => (rv.id === r.targetId ? { ...rv, hidden: hide } : rv)),
    reports: state.reports.map((x) => (x.id === reportId ? { ...x, resolvedAt: ctx.now, resolution: hide ? "Review hidden" : "Review kept" } : x)),
  };
}

export function submitVerification(state: AppState, artisanId: string, ctx: Ctx): AppState {
  const a = mustFind(state.artisans, artisanId, "Artisan");
  if (a.ownerId !== ctx.user.id) throw new Error(DENIED);
  if (a.verification.status === "pending" || a.verification.status === "verified") throw new Error("Verification has already been submitted.");
  return { ...state, artisans: replace(state.artisans, { ...a, verification: { ...a.verification, status: "pending", submittedAt: ctx.now, note: undefined } }) };
}

export function decideVerification(state: AppState, artisanId: string, decision: "verified" | "rejected", checks: VerificationCheck[], note: string, ctx: Ctx): AppState {
  if (!ctx.user.isAdmin) throw new Error(DENIED);
  const a = mustFind(state.artisans, artisanId, "Artisan");
  if (decision === "verified" && checks.length === 0) throw new Error("Tick at least one check you actually performed.");
  const verification = { ...a.verification, status: decision, checks: decision === "verified" ? checks : [], decidedAt: ctx.now, note: note.trim() || undefined };
  return { ...state, artisans: replace(state.artisans, { ...a, verification }) };
}

export function saveBankDetails(state: AppState, artisanId: string, bank: { bankName: string; accountNumber: string; accountName: string; bankCode?: string; verified?: boolean }, ctx: Ctx): AppState {
  const a = mustFind(state.artisans, artisanId, "Artisan");
  if (a.ownerId !== ctx.user.id) throw new Error(DENIED);
  const accountNumber = bank.accountNumber.replace(/\s/g, "");
  if (!bank.bankName.trim()) throw new Error("Choose your bank.");
  if (!/^\d{10}$/.test(accountNumber)) throw new Error("An account number has 10 digits.");
  if (bank.accountName.trim().length < 3) throw new Error("Enter the account name exactly as your bank shows it.");
  return { ...state, artisans: replace(state.artisans, { ...a, bank: { bankName: bank.bankName.trim(), accountNumber, accountName: bank.accountName.trim(), ...(bank.bankCode ? { bankCode: bank.bankCode } : {}), verified: bank.verified === true } }) };
}

/** Admin records that an artisan's share of a released payment was sent to their bank. */
export function markPaidOut(state: AppState, paymentId: string, reference: string, ctx: Ctx): AppState {
  if (!ctx.user.isAdmin) throw new Error(DENIED);
  const p = mustFind(state.payments, paymentId, "Payment");
  if (p.status !== "released") throw new Error("Only a released payment can be paid out.");
  if (p.payout) throw new Error("This payment was already paid out.");
  if (!reference.trim()) throw new Error("Enter the transfer reference from your bank or Paystack.");
  return { ...state, payments: replace(state.payments, { ...p, payout: { paidAt: ctx.now, reference: reference.trim() } }) };
}

export function registerArtisan(
  state: AppState,
  input: { name: string; businessName: string; phone: string; trade: Trade; areaIds: string[]; bio: string; availability: string; service: { title: string; minNaira: number; maxNaira: number | null } },
  ctx: Ctx,
): AppState {
  if (state.artisans.some((a) => a.ownerId === ctx.user.id)) throw new Error("You already have an artisan profile.");
  if (!input.name.trim() || !input.businessName.trim()) throw new Error("Add your name and business name.");
  const phone = normalisePhone(input.phone);
  if (!phone) throw new Error("Enter a Nigerian mobile number customers can reach you on, like 0803 123 4567.");
  if (!TRADES.some((t) => t.id === input.trade)) throw new Error("Choose your trade.");
  if (input.areaIds.length === 0 || !input.areaIds.every((id) => areaById(id))) throw new Error("Choose at least one area you serve.");
  if (new Set(input.areaIds).size > MAX_AREAS) throw new Error(`Choose at most ${MAX_AREAS} areas. You can add more later.`);
  if (!(input.service.minNaira > 0)) throw new Error("Add one service with a starting price.");
  if (!input.service.title.trim()) throw new Error("Say what your first service is.");
  if (input.service.maxNaira !== null && input.service.maxNaira < input.service.minNaira) throw new Error("The top of your price range cannot be below the starting price.");
  const a: Artisan = {
    id: ctx.id("a"),
    ownerId: ctx.user.id,
    name: input.name.trim(),
    businessName: input.businessName.trim(),
    phone,
    trade: input.trade,
    areaIds: [...new Set(input.areaIds)],
    bio: input.bio.trim(),
    availability: input.availability.trim() || "Ask the artisan",
    services: [{ title: input.service.title.trim(), minKobo: Math.round(input.service.minNaira * 100), maxKobo: input.service.maxNaira ? Math.round(input.service.maxNaira * 100) : null }],
    portfolio: [],
    verification: { status: "unverified", checks: [] },
    joinedAt: ctx.now,
  };
  return { ...state, artisans: [...state.artisans, a] };
}
