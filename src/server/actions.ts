"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as eng from "@/lib/engine";
import { actorOn } from "@/lib/access";
import { nairaToKobo } from "@/lib/money";
import type { AppState, Trade, VerificationCheck } from "@/lib/types";
import { getViewer } from "./session";
import { ConflictError, loadAll, persist, type Snapshot } from "./repo";
import { newId } from "./ids";
import { initializeTransaction, paystackEnabled } from "./paystack";

export type Result = { error: string | null };

const ok: Result = { error: null };
const SIGN_IN = "Sign in to continue.";
const SAVE_FAILED = "We could not save that. Please try again in a moment.";

/** Coerces untrusted client input to a bounded string; anything else becomes empty. */
function str(v: unknown, max = 2000): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length > max) throw new Error("That text is too long.");
  return s;
}

/**
 * Load, apply one engine function as the signed-in person, save. Engine errors are written for people and shown as is.
 * If someone else wrote to the same rows in between, the whole step is replayed on fresh data, so a stale screen
 * can never overwrite newer work: the engine simply re-checks the rules against what is true now.
 */
async function mutate(fn: (s: AppState, ctx: eng.Ctx) => AppState): Promise<Result> {
  const user = await getViewer();
  if (!user) return { error: SIGN_IN };
  for (let attempt = 0; attempt < 3; attempt++) {
    let before: Snapshot;
    let after: AppState;
    try {
      before = await loadAll();
    } catch (e) {
      console.error("load failed", e);
      return { error: SAVE_FAILED };
    }
    try {
      after = fn(before.state, { now: new Date().toISOString(), id: newId, user });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Something went wrong." };
    }
    try {
      await persist(before, after);
    } catch (e) {
      if (e instanceof ConflictError) continue;
      console.error("save failed", e);
      return { error: SAVE_FAILED };
    }
    revalidatePath("/", "layout");
    return ok;
  }
  return { error: "That request changed while you were acting. Refresh and try again." };
}

export async function registerArtisan(i: { name: string; businessName: string; phone: string; trade: Trade; areaIds: string[]; bio: string; availability: string; service: string; minNaira: number; maxNaira: number | null }) {
  return mutate((s, c) => {
    const min = Number(i.minNaira);
    const max = i.maxNaira === null || i.maxNaira === undefined ? null : Number(i.maxNaira);
    return eng.registerArtisan(
      s,
      {
        name: str(i.name, 80),
        businessName: str(i.businessName, 80),
        phone: str(i.phone, 30),
        trade: i.trade,
        areaIds: Array.isArray(i.areaIds) ? i.areaIds.slice(0, 200).map((a) => str(a, 64)) : [],
        bio: str(i.bio, 600),
        availability: str(i.availability, 120),
        service: { title: str(i.service, 100), minNaira: Number.isFinite(min) ? min : 0, maxNaira: max !== null && Number.isFinite(max) ? max : null },
      },
      c,
    );
  });
}

export async function createRequest(i: { artisanId: string; areaId: string; title: string; description: string; preferredDate: string; phone: string }) {
  return mutate((s, c) =>
    eng.createRequest(s, { artisanId: str(i.artisanId, 60), areaId: str(i.areaId, 40), title: str(i.title, 120), description: str(i.description, 2000), preferredDate: str(i.preferredDate, 40) || "Flexible", phone: str(i.phone, 30) }, c),
  );
}

export async function sendQuote(bookingId: string, i: { naira: number; description: string; proposedDate: string }) {
  return mutate((s, c) => eng.sendQuote(s, str(bookingId, 60), { amountKobo: nairaToKobo(Number(i.naira)), description: str(i.description, 1000), proposedDate: str(i.proposedDate, 40) || "To be agreed" }, c));
}
export const declineRequest = async (bookingId: string) => mutate((s, c) => eng.declineRequest(s, str(bookingId, 60), c));
export const acceptQuote = async (bookingId: string) => mutate((s, c) => eng.acceptQuote(s, str(bookingId, 60), c));
export const startJob = async (bookingId: string) => mutate((s, c) => eng.startJob(s, str(bookingId, 60), c));
export const markDone = async (bookingId: string) => mutate((s, c) => eng.markDone(s, str(bookingId, 60), c));
export const confirmDone = async (bookingId: string) => mutate((s, c) => eng.confirmDone(s, str(bookingId, 60), c));
export const cancelBooking = async (bookingId: string) => mutate((s, c) => eng.cancelBooking(s, str(bookingId, 60), c));
export const raiseDispute = async (bookingId: string, reason: string) => mutate((s, c) => eng.raiseDispute(s, str(bookingId, 60), str(reason, 1000), c));
export const resolveDispute = async (bookingId: string, outcome: "release" | "refund", note: string) =>
  mutate((s, c) => eng.resolveDispute(s, str(bookingId, 60), outcome === "release" ? "release" : "refund", str(note, 1000) || (outcome === "release" ? "Resolved in the artisan's favour" : "Resolved in the customer's favour"), c));
export const submitReview = async (bookingId: string, rating: number, text: string) => mutate((s, c) => eng.submitReview(s, str(bookingId, 60), Number(rating), str(text, 1000), c));
export const reportReview = async (reviewId: string, reason: string) => mutate((s, c) => eng.reportReview(s, str(reviewId, 60), str(reason, 1000), c));
export const moderateReview = async (reportId: string, hide: boolean) => mutate((s, c) => eng.moderateReview(s, str(reportId, 60), hide === true, c));
export const saveBankDetails = async (artisanId: string, b: { bankName: string; accountNumber: string; accountName: string }) =>
  mutate((s, c) => eng.saveBankDetails(s, str(artisanId, 60), { bankName: str(b?.bankName, 60), accountNumber: str(b?.accountNumber, 20), accountName: str(b?.accountName, 80) }, c));
export const markPaidOut = async (paymentId: string, reference: string) => mutate((s, c) => eng.markPaidOut(s, str(paymentId, 60), str(reference, 80), c));
export const submitVerification = async (artisanId: string) => mutate((s, c) => eng.submitVerification(s, str(artisanId, 60), c));
export const decideVerification = async (artisanId: string, decision: "verified" | "rejected", checks: VerificationCheck[], note: string) =>
  mutate((s, c) => eng.decideVerification(s, str(artisanId, 60), decision === "verified" ? "verified" : "rejected", (Array.isArray(checks) ? checks : []).filter((x) => ["phone", "id", "address", "guarantor"].includes(x)), str(note, 500), c));

/** Starts a Paystack checkout for an accepted quote. Returns the hosted payment page to send the customer to. */
export async function startPayment(bookingId: string): Promise<Result & { url?: string }> {
  const user = await getViewer();
  if (!user) return { error: SIGN_IN };
  if (!paystackEnabled()) return { error: "Online payment is not switched on yet." };
  let state: AppState;
  try {
    state = (await loadAll()).state;
  } catch (e) {
    console.error("load failed", e);
    return { error: SAVE_FAILED };
  }
  const b = state.bookings.find((x) => x.id === str(bookingId, 60));
  if (!b || actorOn(state, b, user) !== "customer") return { error: "You cannot do that on this request." };
  if (b.status !== "awaiting_payment" || !b.quote) return { error: "This request is not waiting for payment." };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountKobo: b.quote.amountKobo,
      reference: newId("sbh"),
      callbackUrl: `${proto}://${host}/pay/callback`,
      bookingId: b.id,
    });
    return { error: null, url: tx.authorization_url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start the payment." };
  }
}
