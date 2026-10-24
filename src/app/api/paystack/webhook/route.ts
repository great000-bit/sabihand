import { settleReference } from "@/server/payments";
import { validSignature } from "@/server/paystack";

export const dynamic = "force-dynamic";

/** Paystack tells us a charge succeeded. Verified by signature, then re-confirmed with Paystack before anything is recorded. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-paystack-signature"))) return new Response("invalid signature", { status: 401 });
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (event.event === "charge.success" && event.data?.reference) {
    const r = await settleReference(event.data.reference);
    // A non-2xx makes Paystack retry. Only retry on provider/database trouble, not on payments that can never apply.
    if (!r.ok && /try again|respond|save/i.test(r.error)) return new Response("retry", { status: 500 });
  }
  return new Response("ok");
}
