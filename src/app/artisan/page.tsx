"use client";

import { useStore } from "@/lib/store";
import * as eng from "@/lib/engine";
import { isOpen } from "@/lib/booking";
import { BookingRow } from "../requests/page";
import { Card, Chip, Empty, LinkButton, Button, VerifiedBadge, inputCls } from "@/components/ui";
import { formatNaira, artisanPayoutKobo } from "@/lib/money";
import { ratingSummary } from "@/lib/reviews";
import { useState } from "react";

export default function ArtisanDashboard() {
  const { state, run, setActiveArtisan, setRole } = useStore();
  const [err, setErr] = useState<string | null>(null);
  if (state.role !== "artisan") {
    return (
      <Empty title="This area is for artisans">
        <Button variant="dark" onClick={() => setRole("artisan")}>Switch to artisan view</Button>
      </Empty>
    );
  }
  const me = state.artisans.find((a) => a.id === state.activeArtisanId) ?? state.artisans[0];
  const jobs = state.bookings.filter((b) => b.artisanId === me.id);
  const incoming = jobs.filter((b) => b.status === "pending_response");
  const active = jobs.filter((b) => isOpen(b.status) && b.status !== "pending_response");
  const done = jobs.filter((b) => !isOpen(b.status));
  const paid = state.payments.filter((p) => p.status === "released" && jobs.some((b) => b.id === p.bookingId));
  const earned = paid.reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const { count, average } = ratingSummary(state.reviews.filter((r) => r.artisanId === me.id));
  const v = me.verification;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">{me.businessName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VerifiedBadge v={v} detailed />
            <Chip>{average === null ? "No reviews yet" : `★ ${average.toFixed(1)} · ${count} reviews`}</Chip>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold" htmlFor="who">Demo: act as</label>
          <select id="who" value={me.id} onChange={(e) => setActiveArtisan(e.target.value)} className={`${inputCls} !w-auto`}>
            {state.artisans.map((a) => (
              <option key={a.id} value={a.id}>{a.businessName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm font-bold text-muted">New requests</p><p className="font-display text-4xl font-extrabold">{incoming.length}</p></Card>
        <Card className="p-5"><p className="text-sm font-bold text-muted">Jobs in progress</p><p className="font-display text-4xl font-extrabold">{active.length}</p></Card>
        <Card className="bg-midnight p-5 text-white"><p className="text-sm font-bold text-gold">Paid out (demo)</p><p className="font-display text-4xl font-extrabold">{formatNaira(earned)}</p></Card>
      </div>

      {v.status !== "verified" && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-gold/50 bg-gold-soft p-6">
          <div>
            <h2 className="text-xl font-extrabold">{v.status === "pending" ? "Verification is being reviewed" : v.status === "rejected" ? "Verification was not approved" : "Get verified"}</h2>
            <p className="text-slate">{v.status === "pending" ? "The Sabihand team will check your details and update your badge." : v.status === "rejected" ? v.note ?? "Update your details and apply again." : "Verified artisans are shown first and get more requests."}</p>
          </div>
          {v.status !== "pending" && <Button variant="dark" onClick={() => setErr(run((s, c) => eng.submitVerification(s, me.id, c)))}>Submit for verification</Button>}
        </Card>
      )}
      {err && <p className="text-alert">{err}</p>}

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">New requests</h2>
        {incoming.length === 0 ? <p className="text-slate">No new requests. Share your profile to get more.</p> : incoming.map((b) => <BookingRow key={b.id} b={b} artisanName={me.businessName} showCustomer />)}
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Active jobs</h2>
        {active.length === 0 ? <p className="text-slate">Nothing active.</p> : active.map((b) => <BookingRow key={b.id} b={b} artisanName={me.businessName} showCustomer />)}
      </section>
      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-extrabold">Finished</h2>
          {done.map((b) => <BookingRow key={b.id} b={b} artisanName={me.businessName} showCustomer />)}
        </section>
      )}
      <LinkButton href={`/artisans/${me.id}`} variant="ghost">See my public profile</LinkButton>
    </div>
  );
}
