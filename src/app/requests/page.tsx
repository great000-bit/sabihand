"use client";

import { useStore } from "@/lib/store";
import { isOpen } from "@/lib/booking";
import { BookingRow } from "@/components/booking-row";
import { SignedInOnly } from "@/components/gate";
import { Empty, LinkButton, PageHeader } from "@/components/ui";

export default function Requests() {
  const { state, viewer } = useStore();
  const mine = state.bookings.filter((b) => b.customerId === viewer?.id);
  const open = mine.filter((b) => isOpen(b.status));
  const closed = mine.filter((b) => !isOpen(b.status));
  const nameOf = (id: string) => state.artisans.find((a) => a.id === id)?.businessName ?? "Artisan";
  return (
    <SignedInOnly title="Sign in to see your requests">
      <div className="space-y-10">
        <PageHeader title="My requests" action={<LinkButton href="/artisans">Find an artisan</LinkButton>}>
          Every job you have asked for, with its price and status.
        </PageHeader>
        {mine.length === 0 ? (
          <Empty title="No requests yet">
            Find an artisan near you and send your first request. It costs nothing until you accept a quote.
            <div className="mt-5"><LinkButton href="/artisans" variant="dark">Find an artisan</LinkButton></div>
          </Empty>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold">In progress</h2>
              {open.length === 0 ? <p className="text-slate">Nothing open right now.</p> : open.map((b) => <BookingRow key={b.id} b={b} artisanName={nameOf(b.artisanId)} />)}
            </section>
            {closed.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xl font-extrabold">Finished</h2>
                {closed.map((b) => (
                  <BookingRow key={b.id} b={b} artisanName={nameOf(b.artisanId)} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </SignedInOnly>
  );
}
