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

export interface Bank {
  name: string;
  code: string;
}

/** Nigerian banks with their Paystack codes. The list barely changes, so it is cached for a day. */
export async function listBanks(): Promise<Bank[]> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Bank lookup is not switched on yet.");
  const res = await fetch(`${API}/bank?country=nigeria&perPage=200&use_cursor=false`, { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 86400 } });
  const body = (await res.json().catch(() => null)) as { status?: boolean; data?: { name: string; code: string; active?: boolean; is_deleted?: boolean | null }[] } | null;
  if (!res.ok || !body?.status || !body.data) throw new Error("Could not load the list of banks. Try again.");
  const seen = new Set<string>();
  return body.data
    .filter((b) => b.active !== false && !b.is_deleted)
    .filter((b) => (seen.has(b.code) ? false : (seen.add(b.code), true)))
    .map((b) => ({ name: b.name, code: b.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Asks the bank who owns an account number. Returns the name exactly as the bank holds it. */
export async function resolveAccount(accountNumber: string, bankCode: string): Promise<string> {
  const data = await call<{ account_name: string }>(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
  return data.account_name;
}
