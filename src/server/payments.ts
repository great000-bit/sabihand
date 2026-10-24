import { recordPayment } from "@/lib/engine";
import { ConflictError, loadAll, persist } from "./repo";
import { newId } from "./ids";
import { verifyTransaction } from "./paystack";

export type Settled = { ok: true; bookingId: string } | { ok: false; error: string };

/**
 * Confirms a charge with Paystack and records it against the booking. The provider's answer is the only
 * thing trusted. Safe to call twice (callback and webhook): the second call finds the reference already recorded.
 */
export async function settleReference(reference: string): Promise<Settled> {
  let tx;
  try {
    tx = await verifyTransaction(reference);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not confirm the payment." };
  }
  const bookingId = tx.metadata?.bookingId;
  if (tx.status !== "success" || tx.currency !== "NGN" || !bookingId) return { ok: false, error: "This payment was not completed." };
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await loadAll();
    try {
      const after = recordPayment(before.state, bookingId, { providerRef: tx.reference, amountKobo: tx.amount }, { now: new Date().toISOString(), id: newId });
      await persist(before, after);
      return { ok: true, bookingId };
    } catch (e) {
      if (e instanceof ConflictError) continue;
      // The callback and webhook can race: if the other one already recorded this reference, that is success.
      const again = await loadAll();
      if (again.state.payments.some((p) => p.providerRef === tx.reference)) return { ok: true, bookingId };
      return { ok: false, error: e instanceof Error ? e.message : "Could not record the payment." };
    }
  }
  return { ok: false, error: "The payment is confirmed but could not be recorded just now. Please try again in a moment." };
}
