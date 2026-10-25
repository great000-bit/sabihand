"use client";

import { useStore } from "@/lib/store";
import { isOpen } from "@/lib/booking";
import { BookingRow } from "@/components/booking-row";
import { SignedInOnly } from "@/components/gate";
import { Card, Empty, LinkButton, PageHeader, Tabs } from "@/components/ui";
import { useState } from "react";

export default function Requests() {
  const { state, viewer } = useStore();
  const [tab, setTab] = useState<"open" | "closed">("open");
  const mine = state.bookings.filter((b) => b.customerId === viewer?.id);
  const open = mine.filter((b) => isOpen(b.status));
  const closed = mine.filter((b) => !isOpen(b.status));
  const nameOf = (id: string) => state.artisans.find((a) => a.id === id)?.businessName ?? "Artisan";
  return (
    <SignedInOnly title="Sign in to see your requests">
      <div className="space-y-6">
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
            <Tabs
              tabs={[
                { id: "open" as const, label: "In progress", count: open.length },
                { id: "closed" as const, label: "Finished", count: closed.length },
              ]}
              value={tab}
              onChange={setTab}
            />
            <section className="space-y-3">
              {(tab === "open" ? open : closed).length === 0 ? (
                <Card className="p-5 text-slate">{tab === "open" ? "Nothing open right now." : "Finished requests appear here."}</Card>
              ) : (
                (tab === "open" ? open : closed).map((b) => <BookingRow key={b.id} b={b} artisanName={nameOf(b.artisanId)} />)
              )}
            </section>
          </>
        )}
      </div>
    </SignedInOnly>
  );
}
