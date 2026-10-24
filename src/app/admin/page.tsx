"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import * as eng from "@/lib/engine";
import { areaById, tradeById } from "@/lib/seed";
import { formatNaira } from "@/lib/money";
import type { VerificationCheck } from "@/lib/types";
import { Button, Card, Chip, Empty, ErrorNote, Field, StatusPill, VerifiedBadge, inputCls } from "@/components/ui";

const CHECKS: { id: VerificationCheck; label: string }[] = [
  { id: "phone", label: "Phone number confirmed" },
  { id: "id", label: "Government ID seen" },
  { id: "address", label: "Address confirmed" },
  { id: "guarantor", label: "Guarantor contacted" },
];

function VerificationCard({ id }: { id: string }) {
  const { state, run } = useStore();
  const a = state.artisans.find((x) => x.id === id)!;
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-extrabold">{a.businessName}</h3>
          <p className="text-sm text-slate">{tradeById(a.trade).label} · {a.name} · {a.areaIds.map((i) => areaById(i)?.name).join(", ")}</p>
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
          <Button variant="primary" onClick={() => setErr(run((s, c) => eng.decideVerification(s, a.id, "verified", checks, note, c)))}>Approve</Button>
          <Button variant="danger" onClick={() => setErr(run((s, c) => eng.decideVerification(s, a.id, "rejected", [], note, c)))}>Reject</Button>
        </div>
      </div>
    </Card>
  );
}

export default function Admin() {
  const { state, run, setRole } = useStore();
  if (state.role !== "admin") {
    return <Empty title="Admin area"><Button variant="dark" onClick={() => setRole("admin")}>Switch to admin view</Button></Empty>;
  }
  const pending = state.artisans.filter((a) => a.verification.status === "pending");
  const openReports = state.reports.filter((r) => !r.resolvedAt);
  const gmv = state.payments.filter((p) => p.status === "released").reduce((s, p) => s + p.amountKobo, 0);
  const commission = state.payments.filter((p) => p.status === "released").reduce((s, p) => s + p.commissionKobo, 0);
  const held = state.payments.filter((p) => p.status === "held").reduce((s, p) => s + p.amountKobo, 0);
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
      <h1 className="text-4xl font-extrabold">Admin</h1>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">{l}</p><p className="font-display text-3xl font-extrabold">{v}</p></Card>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-midnight p-5 text-white"><p className="text-sm font-bold text-gold">Value of completed jobs (demo)</p><p className="font-display text-3xl font-extrabold">{formatNaira(gmv)}</p></Card>
        <Card className="bg-gold p-5"><p className="text-sm font-bold">Commission earned (demo)</p><p className="font-display text-3xl font-extrabold">{formatNaira(commission)}</p></Card>
        <Card className="p-5"><p className="text-sm font-bold text-muted">Held in escrow (demo)</p><p className="font-display text-3xl font-extrabold">{formatNaira(held)}</p></Card>
      </div>

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
                <Button variant="danger" onClick={() => run((s, c) => eng.moderateReview(s, r.id, true, c))}>Hide review</Button>
                <Button variant="ghost" onClick={() => run((s, c) => eng.moderateReview(s, r.id, false, c))}>Keep review</Button>
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
