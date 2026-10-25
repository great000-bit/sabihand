"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import * as actions from "@/server/actions";
import { isOpen } from "@/lib/booking";
import { BookingRow } from "@/components/booking-row";
import { SignedInOnly } from "@/components/gate";
import { Button, Card, Chip, ErrorNote, Field, LinkButton, PageHeader, VerifiedBadge, inputCls } from "@/components/ui";
import { artisanPayoutKobo, formatNaira } from "@/lib/money";
import { ratingSummary } from "@/lib/reviews";
import { BANKS } from "@/lib/catalog";
import type { Artisan } from "@/lib/types";

function PayoutAccount({ me }: { me: Artisan }) {
  const { act, busy } = useStore();
  const [open, setOpen] = useState(!me.bank);
  const [f, setF] = useState({ bankName: me.bank?.bankName ?? "", accountNumber: me.bank?.accountNumber ?? "", accountName: me.bank?.accountName ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Payout account</h2>
          <p className="text-slate">{me.bank ? `${me.bank.bankName} · ${me.bank.accountName} · ••••${me.bank.accountNumber.slice(-4)}` : "Add the bank account where your earnings are paid."}</p>
        </div>
        {me.bank && !open && <Button variant="ghost" onClick={() => setOpen(true)}>Change</Button>}
      </div>
      {open && (
        <form
          className="mt-5 grid gap-4 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const error = await act(() => actions.saveBankDetails(me.id, f));
            setErr(error);
            if (!error) setOpen(false);
          }}
        >
          <Field label="Bank">
            <input list="banks" value={f.bankName} onChange={set("bankName")} className={inputCls} required maxLength={60} />
            <datalist id="banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
          </Field>
          <Field label="Account number"><input inputMode="numeric" value={f.accountNumber} onChange={set("accountNumber")} className={inputCls} required maxLength={14} /></Field>
          <Field label="Account name"><input value={f.accountName} onChange={set("accountName")} className={inputCls} required maxLength={80} /></Field>
          <div className="space-y-3 sm:col-span-3">
            <ErrorNote message={err} />
            <Button type="submit" disabled={busy}>Save account</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function Dashboard() {
  const { state, me, act, busy } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  if (!me) {
    return (
      <Card className="mx-auto mt-6 max-w-lg p-8 text-center sm:p-10">
        <h1 className="text-3xl font-extrabold">You do not have an artisan profile yet</h1>
        <p className="mt-2 text-slate">Create one in a few minutes to start receiving requests from people near you.</p>
        <div className="mt-6 flex justify-center"><LinkButton href="/artisan/join">Create your profile</LinkButton></div>
      </Card>
    );
  }
  const jobs = state.bookings.filter((b) => b.artisanId === me.id);
  const incoming = jobs.filter((b) => b.status === "pending_response");
  const active = jobs.filter((b) => isOpen(b.status) && b.status !== "pending_response");
  const done = jobs.filter((b) => !isOpen(b.status));
  const mine = state.payments.filter((p) => jobs.some((b) => b.id === p.bookingId));
  const released = mine.filter((p) => p.status === "released").reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const paidOut = mine.filter((p) => p.payout).reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const held = mine.filter((p) => p.status === "held").reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const reviews = state.reviews.filter((r) => r.artisanId === me.id);
  const { count, average } = ratingSummary(reviews);
  const v = me.verification;

  return (
    <div className="space-y-10">
      <PageHeader
        title={me.businessName}
        action={<LinkButton href={`/artisans/${me.id}`} variant="ghost">View public profile</LinkButton>}
      >
        <span className="flex flex-wrap items-center gap-2">
          <VerifiedBadge v={v} detailed />
          <Chip>{average === null ? "No reviews yet" : `★ ${average.toFixed(1)} · ${count} ${count === 1 ? "review" : "reviews"}`}</Chip>
        </span>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-sm font-bold text-muted">New requests</p><p className="font-display text-4xl font-extrabold">{incoming.length}</p></Card>
        <Card className="p-5"><p className="text-sm font-bold text-muted">Active jobs</p><p className="font-display text-4xl font-extrabold">{active.length}</p></Card>
        <Card className="p-5"><p className="text-sm font-bold text-muted">Held for you</p><p className="font-display text-3xl font-extrabold sm:text-4xl">{formatNaira(held)}</p></Card>
        <Card className="bg-panel p-5 text-white"><p className="text-sm font-bold text-gold">Earned</p><p className="font-display text-3xl font-extrabold sm:text-4xl">{formatNaira(released)}</p></Card>
      </div>
      {released > 0 && (
        <p className="-mt-6 text-sm text-muted">
          Earnings are after the Sabihand commission. {formatNaira(paidOut)} has been paid to your bank so far.
          {released > paidOut && !me.bank && " Add your payout account below so the Sabihand team can pay the rest."}
        </p>
      )}
      <PayoutAccount me={me} />

      {v.status !== "verified" && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-gold/50 bg-gold-soft p-6">
          <div className="max-w-xl">
            <h2 className="text-xl font-extrabold">{v.status === "pending" ? "Verification is being reviewed" : v.status === "rejected" ? "Verification was not approved" : "Get verified"}</h2>
            <p className="text-slate">{v.status === "pending" ? "The Sabihand team will check your details and update your badge." : v.status === "rejected" ? v.note ?? "Update your details and apply again." : "Verified artisans are shown first and get more requests. The team will check your phone, ID and address."}</p>
          </div>
          {v.status !== "pending" && <Button variant="dark" disabled={busy} onClick={async () => setErr(await act(() => actions.submitVerification(me.id)))}>Submit for verification</Button>}
        </Card>
      )}
      <ErrorNote message={err} />

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">New requests</h2>
        {incoming.length === 0 ? <p className="text-slate">No new requests. Share your profile link to get your first one.</p> : incoming.map((b) => <BookingRow key={b.id} b={b} artisanName={me.businessName} showCustomer />)}
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
      {reviews.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-extrabold">Your reviews</h2>
          {reviews.map((r) => (
            <Card key={r.id} className="p-5">
              <p className="font-bold">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span> <span className="ml-2 text-sm font-medium text-muted">{r.customerName}</span></p>
              {r.text && <p className="mt-1 text-slate">{r.text}</p>}
              {reporting === r.id ? (
                <div className="mt-3 space-y-2">
                  <Field label="Why is this review unfair or false?"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={inputCls} /></Field>
                  <div className="flex gap-2">
                    <Button variant="danger" disabled={busy} onClick={async () => { const e = await act(() => actions.reportReview(r.id, reason)); setErr(e); if (!e) { setReporting(null); setReason(""); } }}>Send report</Button>
                    <Button variant="ghost" onClick={() => setReporting(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button className="mt-2 text-sm font-bold text-link" onClick={() => setReporting(r.id)}>Report this review</button>
              )}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

export default function ArtisanDashboard() {
  return (
    <SignedInOnly title="Sign in to see your jobs">
      <Dashboard />
    </SignedInOnly>
  );
}
