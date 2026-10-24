import { redirect } from "next/navigation";
import { settleReference } from "@/server/payments";
import { Card, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment" };

export default async function PaymentCallback({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const reference = sp.reference ?? sp.trxref;
  if (!reference) redirect("/requests");
  const r = await settleReference(reference);
  if (r.ok) redirect(`/requests/${r.bookingId}?paid=1`);
  return (
    <div className="mx-auto max-w-lg py-16">
      <Card className="p-8 text-center">
        <h1 className="text-2xl font-extrabold">We could not confirm your payment</h1>
        <p className="mt-2 text-slate">{r.error} If money left your account, it is safe with the payment provider. Confirmation can take a minute, so check your request again shortly.</p>
        <div className="mt-6 flex justify-center">
          <LinkButton href="/requests">Go to my requests</LinkButton>
        </div>
      </Card>
    </div>
  );
}
