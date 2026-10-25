"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import * as actions from "@/server/actions";
import { addAdmin, listAdmins, removeAdmin, type AdminRow } from "@/server/admin-actions";
import { areaSummary, tradeById } from "@/lib/catalog";
import { artisanPayoutKobo, formatNaira } from "@/lib/money";
import type { VerificationCheck } from "@/lib/types";
import { SignedInOnly } from "@/components/gate";
import { Button, Card, Chip, Empty, ErrorNote, Field, PageHeader, StatCard, StatusPill, Tabs, VerifiedBadge, inputCls } from "@/components/ui";

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
            <>
              <p className="text-sm text-slate">{a.bank.bankName} · <b>{a.bank.accountNumber}</b> · {a.bank.accountName}</p>
              {a.bank.verified ? <p className="text-sm font-semibold text-verified">✓ Name confirmed by the bank</p> : <p className="text-sm font-semibold text-gold-ink">Name typed by the artisan and not checked by the bank. Confirm it before you pay.</p>}
            </>
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

function TeamSection() {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await listAdmins();
    setRows(r.admins);
    if (r.error) setErr(r.error);
  }, []);
  useEffect(() => {
    let off = false;
    void listAdmins().then((r) => {
      if (off) return;
      setRows(r.admins);
      if (r.error) setErr(r.error);
    });
    return () => {
      off = true;
    };
  }, []);
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-extrabold">Admin team</h2>
      <p className="text-slate">Only super admins see this. Add someone by the email they signed up with. They get the admin area as soon as they reload.</p>
      <Card className="space-y-4 p-5">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await addAdmin(email);
            setBusy(false);
            setErr(r.error);
            if (!r.error) {
              setEmail("");
              await load();
            }
          }}
        >
          <div className="min-w-56 flex-1"><Field label="Email of the new admin"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@example.com" required maxLength={200} /></Field></div>
          <Button type="submit" disabled={busy}>Make admin</Button>
        </form>
        <ErrorNote message={err} />
        <ul className="divide-y divide-line">
          {rows === null && <li className="py-3 text-slate">Loading…</li>}
          {rows?.map((r) => (
            <li key={r.userId} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-bold">{r.name} {r.super && <Chip tone="gold">Super admin</Chip>}</p>
                <p className="text-sm text-slate">{r.email}</p>
              </div>
              {!r.super && (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const x = await removeAdmin(r.userId);
                    setBusy(false);
                    setErr(x.error);
                    await load();
                  }}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

export default function AdminPage() {
  return (
    <SignedInOnly title="Sign in to the admin area">
      <Admin />
    </SignedInOnly>
  );
}

type Tab = "overview" | "payouts" | "verification" | "reports" | "requests" | "team";

function Admin() {
  const { state, viewer, act, busy } = useStore();
  const [tab, setTab] = useState<Tab>("overview");
  if (!viewer?.isAdmin) {
    return <Empty title="This area is for the Sabihand team">Your account does not have admin access.</Empty>;
  }
  const pending = state.artisans.filter((a) => a.verification.status === "pending");
  const openReports = state.reports.filter((r) => !r.resolvedAt);
  const released = state.payments.filter((p) => p.status === "released");
  const gmv = released.reduce((s, p) => s + p.amountKobo, 0);
  const commission = released.reduce((s, p) => s + p.commissionKobo, 0);
  const held = state.payments.filter((p) => p.status === "held").reduce((s, p) => s + p.amountKobo, 0);
  const due = released.filter((p) => !p.payout);
  const dueKobo = due.reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const completed = state.bookings.filter((b) => b.status === "completed").length;
  const waiting = [
    { tab: "payouts" as const, n: due.length, text: due.length === 1 ? "payout to send" : "payouts to send", sub: formatNaira(dueKobo) },
    { tab: "verification" as const, n: pending.length, text: pending.length === 1 ? "artisan to verify" : "artisans to verify", sub: "Check their details" },
    { tab: "reports" as const, n: openReports.length, text: openReports.length === 1 ? "open report" : "open reports", sub: "Disputes and flagged reviews" },
  ].filter((x) => x.n > 0);

  const tabs: { id: Tab; label: string; count?: number; alert?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "payouts", label: "Payouts", count: due.length, alert: true },
    { id: "verification", label: "Verification", count: pending.length, alert: true },
    { id: "reports", label: "Reports", count: openReports.length, alert: true },
    { id: "requests", label: "Requests", count: state.bookings.length },
    ...(viewer.isSuperAdmin ? [{ id: "team" as const, label: "Admin team" }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={viewer.isSuperAdmin ? "Super admin" : "Admin"}>Verification, payouts, reports and a live view of the marketplace.</PageHeader>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Value of completed jobs" value={formatNaira(gmv)} />
            <StatCard label="Commission earned" value={formatNaira(commission)} tone="gold" />
            <StatCard label="Held for jobs in progress" value={formatNaira(held)} tone="glow" />
            <StatCard label="To pay out" value={formatNaira(dueKobo)} hint={`${due.length} ${due.length === 1 ? "payment" : "payments"}`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Artisans" value={state.artisans.length} />
            <StatCard label="Requests" value={state.bookings.length} />
            <StatCard label="Completed jobs" value={completed} />
          </div>
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold">Needs your attention</h2>
            {waiting.length === 0 ? (
              <Card className="p-5 text-slate">All clear. Nothing is waiting on you.</Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {waiting.map((w) => (
                  <button key={w.tab} onClick={() => setTab(w.tab)} className="rounded-3xl border border-gold/50 bg-gold-soft p-5 text-left transition hover:-translate-y-0.5 hover:border-gold">
                    <p className="font-display text-4xl font-extrabold text-gold-ink">{w.n}</p>
                    <p className="font-bold">{w.text}</p>
                    <p className="text-sm text-slate">{w.sub}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "payouts" && (
        <section className="space-y-3">
          <p className="text-slate">Released jobs where the artisan has not been paid yet. Send the amount (after commission) to the bank account, then record the transfer reference.</p>
          {due.length === 0 ? <Card className="p-5 text-slate">Nothing to pay out.</Card> : due.map((p) => <PayoutCard key={p.id} id={p.id} />)}
        </section>
      )}

      {tab === "verification" && (
        <section className="space-y-3">
          {pending.length === 0 ? <Card className="p-5 text-slate">No artisans waiting. Pending ones appear here.</Card> : pending.map((a) => <VerificationCard key={a.id} id={a.id} />)}
        </section>
      )}

      {tab === "reports" && (
        <section className="space-y-3">
          {state.reports.length === 0 && <Card className="p-5 text-slate">No reports.</Card>}
          {state.reports.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{r.kind === "booking" ? "Job problem" : r.kind === "review" ? "Reported review" : "Reported artisan"} · by {r.reporterName}</p>
                {r.resolvedAt ? <Chip tone="green">Resolved</Chip> : <Chip tone="alert">Open</Chip>}
              </div>
              <p className="mt-1 text-slate">{r.reason}</p>
              {r.resolution && <p className="mt-1 text-sm text-muted">Outcome: {r.resolution}</p>}
              {!r.resolvedAt && r.kind === "booking" && <Link href={`/requests/${r.targetId}`} className="mt-2 inline-block font-bold text-link">Open the job to resolve →</Link>}
              {!r.resolvedAt && r.kind === "review" && (
                <div className="mt-3 flex gap-2">
                  <Button variant="danger" disabled={busy} onClick={() => act(() => actions.moderateReview(r.id, true))}>Hide review</Button>
                  <Button variant="ghost" disabled={busy} onClick={() => act(() => actions.moderateReview(r.id, false))}>Keep review</Button>
                </div>
              )}
            </Card>
          ))}
        </section>
      )}

      {tab === "requests" && (
        <section className="space-y-3">
          {state.bookings.length === 0 && <Card className="p-5 text-slate">No requests yet.</Card>}
          {state.bookings.map((b) => (
            <Link key={b.id} href={`/requests/${b.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-2 p-4 transition hover:border-white/40">
                <span className="font-bold">{b.title} <span className="font-medium text-muted">· {state.artisans.find((a) => a.id === b.artisanId)?.businessName}</span></span>
                <span className="flex items-center gap-3">{b.quote && <b className="font-display">{formatNaira(b.quote.amountKobo)}</b>}<StatusPill status={b.status} /></span>
              </Card>
            </Link>
          ))}
        </section>
      )}

      {tab === "team" && viewer.isSuperAdmin && <TeamSection />}
    </div>
  );
}
