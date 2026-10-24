"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { isOpen } from "@/lib/booking";
import { areaById, tradeById } from "@/lib/seed";
import { formatNaira } from "@/lib/money";
import { Card, Empty, LinkButton, StatusPill } from "@/components/ui";
import type { Booking } from "@/lib/types";

export function BookingRow({ b, artisanName, showCustomer = false }: { b: Booking; artisanName: string; showCustomer?: boolean }) {
  return (
    <Link href={`/requests/${b.id}`} className="block">
      <Card className="p-5 transition hover:border-midnight">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold">{b.title}</h3>
            <p className="text-sm text-slate">
              {tradeById(b.trade).label} · {showCustomer ? b.customerName : artisanName} · {areaById(b.areaId)?.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {b.quote && <span className="font-display text-lg font-extrabold">{formatNaira(b.quote.amountKobo)}</span>}
            <StatusPill status={b.status} />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function Requests() {
  const { state } = useStore();
  const mine = state.bookings;
  const open = mine.filter((b) => isOpen(b.status));
  const closed = mine.filter((b) => !isOpen(b.status));
  const nameOf = (id: string) => state.artisans.find((a) => a.id === id)?.businessName ?? "Artisan";
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-extrabold">My requests</h1>
          <p className="mt-1 text-slate">Every job you have asked for, with its price and status.</p>
        </div>
        <LinkButton href="/artisans">Find an artisan</LinkButton>
      </div>
      {mine.length === 0 ? (
        <Empty title="No requests yet">Find an artisan near you and send your first request. It costs nothing until you accept a quote.</Empty>
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
  );
}
