"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import * as actions from "@/server/actions";
import { isOpen } from "@/lib/booking";
import { BookingRow } from "@/components/booking-row";
import { ProfilePhotos } from "@/components/photo-tools";
import { SignedInOnly } from "@/components/gate";
import { Button, Card, Chip, ErrorNote, Field, LinkButton, PageHeader, StatCard, Tabs, VerifiedBadge, inputCls } from "@/components/ui";
import { artisanPayoutKobo, formatNaira } from "@/lib/money";
import { ratingSummary } from "@/lib/reviews";
import { BANKS } from "@/lib/catalog";
import type { Artisan } from "@/lib/types";

function PayoutAccount({ me }: { me: Artisan }) {
  const { act, busy, config } = useStore();
  const [open, setOpen] = useState(!me.bank);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [f, setF] = useState({ bankName: me.bank?.bankName ?? "", bankCode: me.bank?.bankCode ?? "", accountNumber: me.bank?.accountNumber ?? "", accountName: me.bank?.accountName ?? "" });
  // The name the bank returned for the number and bank now in the form. "" until a lookup succeeds.
  const [found, setFound] = useState<{ name: string; for: string } | null>(null);
  const [looking, setLooking] = useState(false);
  const [lookErr, setLookErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const live = config.paymentsEnabled && banks.length > 0;
  const key = `${f.bankCode}:${f.accountNumber}`;

  useEffect(() => {
    if (!open || !config.paymentsEnabled || banks.length) return;
    let off = false;
    void actions.listBanks().then((r) => !off && setBanks(r.banks));
    return () => {
      off = true;
    };
  }, [open, config.paymentsEnabled, banks.length]);

  const lookup = async (code: string, num: string) => {
    setFound(null);
    setLookErr(null);
    if (!code || !/^\d{10}$/.test(num)) return;
    setLooking(true);
    const r = await actions.lookupAccount(code, num);
    setLooking(false);
    if (r.error || !r.name) setLookErr(r.error ?? "We could not check that account.");
    else setFound({ name: r.name, for: `${code}:${num}` });
  };

  const pickBank = (code: string) => {
    const bank = banks.find((x) => x.code === code);
    setF((p) => ({ ...p, bankCode: code, bankName: bank?.name ?? "" }));
    void lookup(code, f.accountNumber);
  };
  const setNumber = (v: string) => {
    const num = v.replace(/\D/g, "").slice(0, 10);
    setF((p) => ({ ...p, accountNumber: num }));
    if (live) void lookup(f.bankCode, num);
  };
  const confirmed = live && found?.for === key ? found.name : null;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Payout account</h2>
          <p className="text-slate">{me.bank ? `${me.bank.bankName} · ${me.bank.accountName} · ••••${me.bank.accountNumber.slice(-4)}` : "Add the bank account where your earnings are paid."}</p>
          {me.bank && <p className={`text-sm font-semibold ${me.bank.verified ? "text-verified" : "text-gold-ink"}`}>{me.bank.verified ? "✓ Name confirmed by your bank" : "Name not yet checked by the bank"}</p>}
        </div>
        {me.bank && !open && <Button variant="ghost" onClick={() => setOpen(true)}>Change</Button>}
      </div>
      {open && (
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const error = await act(() => actions.saveBankDetails(me.id, { ...f, accountName: confirmed ?? f.accountName }));
            setErr(error);
            if (!error) setOpen(false);
          }}
        >
          <Field label="Bank">
            {live ? (
              <select value={f.bankCode} onChange={(e) => pickBank(e.target.value)} className={inputCls} required>
                <option value="" disabled>Choose your bank</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            ) : (
              <>
                <input list="banks" value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} className={inputCls} required maxLength={60} />
                <datalist id="banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
              </>
            )}
          </Field>
          <Field label="Account number"><input inputMode="numeric" value={f.accountNumber} onChange={(e) => setNumber(e.target.value)} className={inputCls} required maxLength={10} placeholder="10 digits" /></Field>
          <div className="sm:col-span-2">
            {live ? (
              <div aria-live="polite" className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 ${confirmed ? "border-verified/60 bg-verified/10" : "border-line"}`}>
                {looking ? (
                  <span className="text-slate">Checking with your bank…</span>
                ) : confirmed ? (
                  <>
                    <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-verified text-sm font-extrabold text-white">✓</span>
                    <span><span className="block text-xs font-bold uppercase tracking-wide text-muted">Account name from your bank</span><span className="block text-lg font-extrabold">{confirmed}</span></span>
                  </>
                ) : lookErr ? (
                  <span className="font-semibold text-alert">{lookErr}</span>
                ) : (
                  <span className="text-slate">Choose your bank and enter the 10-digit number. Your account name appears here.</span>
                )}
              </div>
            ) : (
              <Field label="Account name">
                <input value={f.accountName} onChange={(e) => setF({ ...f, accountName: e.target.value })} className={inputCls} required maxLength={80} />
                <span className="mt-1 block text-sm text-muted">Automatic name lookup is not switched on yet. The Sabihand team checks this name before paying you.</span>
              </Field>
            )}
          </div>
          <div className="space-y-3 sm:col-span-2">
            <ErrorNote message={err} />
            <Button type="submit" disabled={busy || looking || (live && !confirmed)}>Save account</Button>
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
  const [tab, setTab] = useState<"new" | "active" | "finished" | "reviews">("new");
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
    <div className="space-y-6">
      <PageHeader
        title={me.businessName}
        action={<LinkButton href={`/artisans/${me.id}`} variant="ghost">View public profile</LinkButton>}
      >
        <span className="flex flex-wrap items-center gap-2">
          <VerifiedBadge v={v} detailed />
          <Chip>{average === null ? "No reviews yet" : `★ ${average.toFixed(1)} · ${count} ${count === 1 ? "review" : "reviews"}`}</Chip>
        </span>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New requests" value={incoming.length} hint={incoming.length ? "Waiting for your reply" : "Nothing waiting"} tone={incoming.length ? "glow" : "plain"} />
        <StatCard label="Active jobs" value={active.length} />
        <StatCard label="Held for you" value={formatNaira(held)} hint="Paid in, released when the job is confirmed" />
        <StatCard label="Earned" value={formatNaira(released)} hint={paidOut ? `${formatNaira(paidOut)} paid to your bank` : undefined} tone="gold" />
      </div>
      {released > 0 && (
        <p className="text-sm text-muted">
          Earnings are after the Sabihand commission. {formatNaira(paidOut)} has been paid to your bank so far.
          {released > paidOut && !me.bank && " Add your payout account below so the Sabihand team can pay the rest."}
        </p>
      )}
      <ProfilePhotos me={me} />
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

      <Tabs
        tabs={[
          { id: "new", label: "New requests", count: incoming.length, alert: true },
          { id: "active", label: "Active", count: active.length },
          { id: "finished", label: "Finished", count: done.length },
          { id: "reviews", label: "Reviews", count: reviews.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "new" && (
        <section className="space-y-3">
          {incoming.length === 0 ? <Card className="p-5 text-slate">No new requests. Share your profile link to get your first one.</Card> : incoming.map((b) => <BookingRow key={b.id} b={b} artisanName={me.businessName} showCustomer />)}
        </section>
      )}
      {tab === "active" && (
        <section className="space-y-3">
          {active.length === 0 ? <Card className="p-5 text-slate">Nothing active.</Card> : active.map((b) => <BookingRow key={b.id} b={b} artisanName={me.businessName} showCustomer />)}
        </section>
      )}
      {tab === "finished" && (
        <section className="space-y-3">
          {done.length === 0 ? <Card className="p-5 text-slate">Finished jobs appear here.</Card> : done.map((b) => <BookingRow key={b.id} b={b} artisanName={me.businessName} showCustomer />)}
        </section>
      )}
      {tab === "reviews" && (
        <section className="space-y-3">
          {reviews.length === 0 && <Card className="p-5 text-slate">No reviews yet. They appear after a customer completes a job.</Card>}
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
