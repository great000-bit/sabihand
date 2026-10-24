import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paystack.co";

export const paystackEnabled = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Online payment is not switched on yet.");
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, cache: "no-store" });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !body?.status || !body.data) throw new Error(body?.message || "The payment provider did not respond. Try again.");
  return body.data;
}

export async function initializeTransaction(input: { email: string; amountKobo: number; reference: string; callbackUrl: string; bookingId: string }) {
  return call<{ authorization_url: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: { bookingId: input.bookingId },
    }),
  });
}

export interface VerifiedTransaction {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  metadata?: { bookingId?: string } | null;
}

export async function verifyTransaction(reference: string) {
  return call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Paystack signs the raw webhook body with the secret key (HMAC SHA512). */
export function validSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
