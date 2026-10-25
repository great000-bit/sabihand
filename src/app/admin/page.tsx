"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import * as actions from "@/server/actions";
import { areaSummary, tradeById } from "@/lib/catalog";
import { artisanPayoutKobo, formatNaira } from "@/lib/money";
import type { VerificationCheck } from "@/lib/types";
import { SignedInOnly } from "@/components/gate";
import { Button, Card, Chip, Empty, ErrorNote, Field, PageHeader, StatusPill, VerifiedBadge, inputCls } from "@/components/ui";

const CHECKS: { id: VerificationCheck; label: string }[] = [
  { id: "phone", label: "Phone number confirmed" },
  { id: "id", label: "Government ID seen" },
  { id: "address", label: "Address confirmed" },
  { id: "guarantor", label: "Guarantor contacted" },
];

function PayoutCard({ id }: { id: string }) {
  const { state, act, busy } = useStore();
  const p = state.payments.find((x) => x.id === id)!;
  const b = state.bookings.find((x) => x.id === p.bookingId);
  const a = state.artisans.find((x) => x.id === b?.artisanId);
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold">{a?.businessName ?? "Artisan"} · {b?.title}</h3>
          {a?.bank ? (
            <p className="text-sm text-slate">{a.bank.bankName} · <b>{a.bank.accountNumber}</b> · {a.bank.accountName}</p>
          ) : (
            <p className="text-sm font-semibold text-alert">No bank account added yet. Ask {a?.name} to add one in their dashboard{a?.phone ? ` (${a.phone})` : ""}.</p>
          )}
        </div>
        <p className="font-display text-2xl font-extrabold">{formatNaira(artisanPayoutKobo(p.amountKobo))}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1"><Field label="Transfer reference"><input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} placeholder="From your bank or Paystack" maxLength={80} /></Field></div>
        <Button disabled={busy || !a?.bank} onClick={async () => setErr(await act(() => actions.markPaidOut(p.id, ref)))}>Mark as paid</Button>
      </div>
      <div className="mt-2"><ErrorNote message={err} /></div>
    </Card>
  );
}

function VerificationCard({ id }: { id: string }) {
  const { state, act, busy } = useStore();
  const a = state.artisans.find((x) => x.id === id)!;
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-extrabold">{a.businessName}</h3>
          <p className="text-sm text-slate">{tradeById(a.trade).label} · {a.name} · {areaSummary(a.areaIds, 4)}</p>
          <p className="text-sm text-slate">Phone: <b>{a.phone}</b></p>
        </div>
        <VerifiedBadge v={a.verification} />
      </div>
      <p className="mt-3 text-sm font-bold">Tick only the checks you actually performed:</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {CHECKS.map((c) => (
          <label key={c.id} className="flex min-h-11 items-center gap-2 rounded-2xl border-2 border-line px-3 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-verified" checked={checks.includes(c.id)} onChange={(e) => setChecks(e.target.checked ? [...checks, c.id] : checks.filter((x) => x !== c.id))} />
            {c.label}
          </label>
        ))}
      </div>
      <div className="mt-3"><Field label="Note (shown to the artisan if rejected)"><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></Field></div>
      <div className="mt-3 space-y-2">
        <ErrorNote message={err} />
        <div className="flex gap-2">
          <Button variant="primary" disabled={busy} onClick={async () => setErr(await act(() => actions.decideVerification(a.id, "verified", checks, note)))}>Approve</Button>
          <Button variant="danger" disabled={busy} onClick={async () => setErr(await act(() => actions.decideVerification(a.id, "rejected", [], note)))}>Reject</Button>
        </div>
      </div>
    </Card>
  );
}

export default function AdminPage() {
  return (
    <SignedInOnly title="Sign in to the admin area">
      <Admin />
    </SignedInOnly>
  );
}

function Admin() {
  const { state, viewer, act, busy } = useStore();
  if (!viewer?.isAdmin) {
    return <Empty title="This area is for the Sabihand team">Your account does not have admin access.</Empty>;
  }
  const pending = state.artisans.filter((a) => a.verification.status === "pending");
  const openReports = state.reports.filter((r) => !r.resolvedAt);
  const gmv = state.payments.filter((p) => p.status === "released").reduce((s, p) => s + p.amountKobo, 0);
  const commission = state.payments.filter((p) => p.status === "released").reduce((s, p) => s + p.commissionKobo, 0);
  const held = state.payments.filter((p) => p.status === "held").reduce((s, p) => s + p.amountKobo, 0);
  const due = state.payments.filter((p) => p.status === "released" && !p.payout);
  const completed = state.bookings.filter((b) => b.status === "completed").length;

  const stats = [
    ["Artisans", state.artisans.length],
    ["Requests", state.bookings.length],
    ["Completed jobs", completed],
    ["Awaiting verification", pending.length],
    ["Open reports", openReports.length],
  ] as const;

  return (
    <div className="space-y-10">
      <PageHeader title="Admin">Verification, reports and a live view of the marketplace.</PageHeader>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">{l}</p><p className="font-display text-3xl font-extrabold">{v}</p></Card>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-midnight p-5 text-white"><p className="text-sm font-bold text-gold">Value of completed jobs</p><p className="font-display text-3xl font-extrabold">{formatNaira(gmv)}</p></Card>
        <Card className="bg-gold p-5"><p className="text-sm font-bold">Commission earned</p><p className="font-display text-3xl font-extrabold">{formatNaira(commission)}</p></Card>
        <Card className="p-5"><p className="text-sm font-bold text-muted">Held for jobs in progress</p><p className="font-display text-3xl font-extrabold">{formatNaira(held)}</p></Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Payouts due</h2>
        <p className="text-slate">Released jobs where the artisan has not been paid yet. Send the amount (after commission) to the bank account, then record the transfer reference.</p>
        {due.length === 0 ? <p className="text-slate">Nothing to pay out.</p> : due.map((p) => <PayoutCard key={p.id} id={p.id} />)}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Verification queue</h2>
        {pending.length === 0 ? <p className="text-slate">No artisans waiting. Pending ones appear here.</p> : pending.map((a) => <VerificationCard key={a.id} id={a.id} />)}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Reports and problems</h2>
        {state.reports.length === 0 && <p className="text-slate">No reports.</p>}
        {state.reports.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{r.kind === "booking" ? "Job problem" : r.kind === "review" ? "Reported review" : "Reported artisan"} · by {r.reporterName}</p>
              {r.resolvedAt ? <Chip tone="green">Resolved</Chip> : <Chip tone="alert">Open</Chip>}
            </div>
            <p className="mt-1 text-slate">{r.reason}</p>
            {r.resolution && <p className="mt-1 text-sm text-muted">Outcome: {r.resolution}</p>}
            {!r.resolvedAt && r.kind === "booking" && <Link href={`/requests/${r.targetId}`} className="mt-2 inline-block font-bold text-trust">Open the job to resolve →</Link>}
            {!r.resolvedAt && r.kind === "review" && (
              <div className="mt-3 flex gap-2">
                <Button variant="danger" disabled={busy} onClick={() => act(() => actions.moderateReview(r.id, true))}>Hide review</Button>
                <Button variant="ghost" disabled={busy} onClick={() => act(() => actions.moderateReview(r.id, false))}>Keep review</Button>
              </div>
            )}
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">All requests</h2>
        {state.bookings.map((b) => (
          <Link key={b.id} href={`/requests/${b.id}`} className="block">
            <Card className="flex flex-wrap items-center justify-between gap-2 p-4 hover:border-midnight">
              <span className="font-bold">{b.title} <span className="font-medium text-muted">· {state.artisans.find((a) => a.id === b.artisanId)?.businessName}</span></span>
              <span className="flex items-center gap-3">{b.quote && <b className="font-display">{formatNaira(b.quote.amountKobo)}</b>}<StatusPill status={b.status} /></span>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
