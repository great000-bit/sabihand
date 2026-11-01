"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import * as actions from "@/server/actions";
import { addAdmin, listAdmins, removeAdmin, type AdminRow } from "@/server/admin-actions";
import { areaLabel, areaSummary, tradeById } from "@/lib/catalog";
import { artisanPayoutKobo, formatNaira } from "@/lib/money";
import type { Booking, BookingStatus, Report, VerificationCheck } from "@/lib/types";
import { Logo } from "@/components/chrome";
import { SignedInOnly } from "@/components/gate";
import { Button, Chip, ErrorNote, StatusPill, VerifiedBadge, inputCls } from "@/components/ui";

const CHECKS: { id: VerificationCheck; label: string }[] = [
  { id: "phone", label: "Phone number confirmed" },
  { id: "id", label: "Government ID seen" },
  { id: "address", label: "Address confirmed" },
  { id: "guarantor", label: "Guarantor contacted" },
];

type Section = "overview" | "disputes" | "payouts" | "verification" | "requests" | "team";

/** Small line icons for the sidebar, drawn on a 24px grid. */
const ICONS: Record<Section | "site" | "menu" | "close", ReactNode> = {
  overview: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-4H4z" />,
  disputes: <path d="M12 3 2.5 20h19zM12 10v4M12 17.5v.01" />,
  payouts: <path d="M3 7h18v12H3zM3 11h18M7 15h3" />,
  verification: <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM8.5 12l2.5 2.5 4.5-5" />,
  requests: <path d="M8 4h8l1 2h3v15H4V6h3zM8 11h8M8 15h5" />,
  team: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.7 3 5.2" />,
  site: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return m <= 1 ? "just now" : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} ${d === 1 ? "day" : "days"} ago` : new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
};

/** A plain bordered box: the one surface the admin area uses. */
function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white/[0.03] ${className}`}>{children}</div>;
}

function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "gold" | "alert" }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 font-display text-2xl font-extrabold ${tone === "gold" ? "text-gold-ink" : tone === "alert" ? "text-alert" : ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Panel>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <Panel className="px-5 py-10 text-center text-sm text-slate">{children}</Panel>;
}

/* ------------------------------------------------------------------ disputes and reports */

/**
 * One reported problem with everything needed to decide it, and the decision buttons on the card itself.
 * A job problem settles the held money; a reported review is hidden or kept; anything else is simply closed.
 */
function ReportCard({ report: r }: { report: Report }) {
  const { state, viewer, act, busy } = useStore();
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<"release" | "refund" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const b = r.kind === "booking" ? state.bookings.find((x) => x.id === r.targetId) : undefined;
  const a = b ? state.artisans.find((x) => x.id === b.artisanId) : r.kind === "artisan" ? state.artisans.find((x) => x.id === r.targetId) : undefined;
  const review = r.kind === "review" ? state.reviews.find((x) => x.id === r.targetId) : undefined;
  const reviewed = review ? state.artisans.find((x) => x.id === review.artisanId) : undefined;
  const pay = b ? state.payments.find((p) => p.bookingId === b.id) : undefined;
  const open = !r.resolvedAt;
  const disputed = b?.status === "disputed";
  const own = b && viewer ? (b.customerId === viewer.id ? "customer" : a?.ownerId === viewer.id ? "artisan" : null) : null;
  const run = async (fn: () => Promise<{ error: string | null }>) => {
    setErr(await act(fn));
    setConfirm(null);
  };
  const title = r.kind === "booking" ? (b?.title ?? "Job problem") : r.kind === "review" ? `Review of ${reviewed?.businessName ?? "an artisan"}` : `Report about ${a?.businessName ?? "an artisan"}`;

  return (
    <Panel className={`overflow-hidden ${open ? "border-alert/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {open ? <Chip tone="alert">Open</Chip> : <Chip tone="green">Resolved</Chip>}
            <span className="text-xs font-bold uppercase tracking-wider text-muted">{r.kind === "booking" ? "Job problem" : r.kind === "review" ? "Reported review" : "Reported artisan"}</span>
            <span className="text-xs text-muted">· {ago(r.createdAt)}</span>
          </div>
          <h3 className="mt-1.5 truncate text-lg font-extrabold">{title}</h3>
        </div>
        {pay && (
          <div className="sm:text-right">
            <p className="font-display text-xl font-extrabold">{formatNaira(pay.amountKobo)}</p>
            <p className="text-xs text-muted">{pay.status === "held" ? "Held by Sabihand" : pay.status === "released" ? "Already paid to artisan" : "Refunded"}</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 px-5 py-4 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">What {r.reporterName} said</p>
            <p className="mt-1 whitespace-pre-line rounded-xl bg-alert-soft/60 px-3 py-2 text-[15px]">{r.reason}</p>
          </div>
          {review && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">The review ({review.rating}★ by {review.customerName})</p>
              <p className="mt-1 rounded-xl bg-white/5 px-3 py-2 text-[15px] text-slate">{review.text || "No text, rating only."}</p>
            </div>
          )}
          {r.resolution && <p className="text-sm text-slate"><b className="text-ink">Outcome:</b> {r.resolution}</p>}
        </div>
        {b && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted">Customer</dt>
            <dd className="font-semibold">{b.customerName}{own === "customer" && <span className="ml-1 text-gold-ink">(you)</span>}</dd>
            <dt className="text-muted">Artisan</dt>
            <dd className="font-semibold">{a?.businessName ?? "Unknown"}{a?.phone ? <span className="text-slate"> · {a.phone}</span> : null}{own === "artisan" && <span className="ml-1 text-gold-ink">(you)</span>}</dd>
            <dt className="text-muted">Where</dt>
            <dd>{areaLabel(b.areaId) || "Not given"}</dd>
            <dt className="text-muted">Job status</dt>
            <dd><StatusPill status={b.status} /></dd>
          </dl>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-line bg-white/[0.02] px-5 py-4">
          {r.kind !== "review" && (
            <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} !min-h-10 !py-2 text-[15px]`} placeholder="Note on your decision (optional, both sides can see it)" maxLength={1000} aria-label="Decision note" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {r.kind === "booking" && disputed && !confirm && (
              <>
                <Button disabled={busy} onClick={() => setConfirm("release")}>Release payment to artisan</Button>
                <Button variant="danger" disabled={busy} onClick={() => setConfirm("refund")}>Refund customer</Button>
              </>
            )}
            {confirm && b && (
              <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-gold/50 bg-gold-soft px-3 py-2">
                <p className="mr-auto text-sm font-semibold">
                  {confirm === "release" ? `Pay ${a?.businessName ?? "the artisan"} and close this dispute?` : `Refund ${b.customerName} and close this dispute?`}
                  {confirm === "refund" && pay?.status === "released" && " The money was already paid out, so send the refund by hand."}
                </p>
                <Button variant={confirm === "refund" ? "danger" : "primary"} disabled={busy} onClick={() => run(() => actions.resolveDispute(b.id, confirm, note))}>{busy ? "Saving..." : "Yes, confirm"}</Button>
                <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button>
              </div>
            )}
            {r.kind === "review" && (
              <>
                <Button variant="danger" disabled={busy} onClick={() => run(() => actions.moderateReview(r.id, true))}>Hide review</Button>
                <Button variant="ghost" disabled={busy} onClick={() => run(() => actions.moderateReview(r.id, false))}>Keep review</Button>
              </>
            )}
            {(r.kind === "artisan" || (r.kind === "booking" && !disputed)) && <Button disabled={busy} onClick={() => run(() => actions.closeReport(r.id, note))}>Mark as resolved</Button>}
            {b && !confirm && (
              <Link href={`/requests/${b.id}`} className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-bold text-link hover:underline">
                Open job and chat <Icon name="site" className="h-4 w-4" />
              </Link>
            )}
          </div>
          <ErrorNote message={err} />
        </div>
      )}
    </Panel>
  );
}

function Disputes() {
  const { state } = useStore();
  const [show, setShow] = useState<"open" | "resolved">("open");
  const list = state.reports.filter((r) => (show === "open" ? !r.resolvedAt : r.resolvedAt));
  const counts = { open: state.reports.filter((r) => !r.resolvedAt).length, resolved: state.reports.filter((r) => r.resolvedAt).length };
  return (
    <div className="space-y-4">
      <Segmented value={show} onChange={setShow} options={[["open", `Open (${counts.open})`], ["resolved", `Resolved (${counts.resolved})`]]} />
      {list.length === 0 ? <Quiet>{show === "open" ? "No open problems. Reports from customers and artisans land here." : "Nothing resolved yet."}</Quiet> : list.map((r) => <ReportCard key={r.id} report={r} />)}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="tablist" className="inline-flex rounded-full border border-line bg-white/[0.03] p-1">
      {options.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)} className={`min-h-9 rounded-full px-4 text-sm font-bold transition ${value === id ? "bg-white/15 text-ink" : "text-slate hover:text-ink"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ payouts and verification */

function PayoutCard({ id }: { id: string }) {
  const { state, act, busy } = useStore();
  const p = state.payments.find((x) => x.id === id)!;
  const b = state.bookings.find((x) => x.id === p.bookingId);
  const a = state.artisans.find((x) => x.id === b?.artisanId);
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-extrabold">{a?.businessName ?? "Artisan"} <span className="font-medium text-muted">· {b?.title}</span></h3>
          {a?.bank ? (
            <>
              <p className="mt-1 text-sm text-slate">{a.bank.bankName} · <b className="text-ink">{a.bank.accountNumber}</b> · {a.bank.accountName}</p>
              {a.bank.verified ? <p className="text-sm font-semibold text-verified">✓ Name confirmed by the bank</p> : <p className="text-sm font-semibold text-gold-ink">Name not checked by the bank. Confirm it before you pay.</p>}
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-alert">No bank account yet. Ask {a?.name} to add one{a?.phone ? ` (${a.phone})` : ""}.</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold">{formatNaira(artisanPayoutKobo(p.amountKobo))}</p>
          <p className="text-xs text-muted">after commission</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={ref} onChange={(e) => setRef(e.target.value)} className={`${inputCls} !min-h-10 min-w-56 flex-1 !py-2`} placeholder="Transfer reference" maxLength={80} aria-label="Transfer reference" />
        <Button disabled={busy || !a?.bank} onClick={async () => setErr(await act(() => actions.markPaidOut(p.id, ref)))}>Mark as paid</Button>
      </div>
      <div className="mt-2"><ErrorNote message={err} /></div>
    </Panel>
  );
}

function VerificationCard({ id }: { id: string }) {
  const { state, act, busy } = useStore();
  const a = state.artisans.find((x) => x.id === id)!;
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-extrabold">{a.businessName}</h3>
          <p className="text-sm text-slate">{tradeById(a.trade).label} · {a.name} · {areaSummary(a.areaIds, 3)}</p>
          <p className="text-sm text-slate">Phone: <b className="text-ink">{a.phone}</b> · <Link href={`/artisans/${a.id}`} className="font-bold text-link">View profile</Link></p>
        </div>
        <VerifiedBadge v={a.verification} />
      </div>
      <p className="mt-4 text-sm font-bold">Tick only the checks you actually did</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {CHECKS.map((c) => (
          <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold has-[:checked]:border-verified has-[:checked]:bg-verified-soft">
            <input type="checkbox" className="h-5 w-5 accent-verified" checked={checks.includes(c.id)} onChange={(e) => setChecks(e.target.checked ? [...checks, c.id] : checks.filter((x) => x !== c.id))} />
            {c.label}
          </label>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} mt-3 !min-h-10 !py-2`} placeholder="Note to the artisan if you reject (optional)" aria-label="Note" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={async () => setErr(await act(() => actions.decideVerification(a.id, "verified", checks, note)))}>Approve</Button>
        <Button variant="danger" disabled={busy} onClick={async () => setErr(await act(() => actions.decideVerification(a.id, "rejected", [], note)))}>Reject</Button>
      </div>
      <div className="mt-2"><ErrorNote message={err} /></div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ requests */

const GROUPS: { id: string; label: string; has: (s: BookingStatus) => boolean }[] = [
  { id: "all", label: "All", has: () => true },
  { id: "new", label: "New", has: (s) => s === "pending_response" || s === "accepted" || s === "awaiting_payment" },
  { id: "active", label: "In progress", has: (s) => s === "confirmed" || s === "in_progress" },
  { id: "disputed", label: "Problems", has: (s) => s === "disputed" },
  { id: "done", label: "Closed", has: (s) => s === "completed" || s === "cancelled" || s === "declined" },
];

function Requests() {
  const { state } = useStore();
  const [group, setGroup] = useState("all");
  const g = GROUPS.find((x) => x.id === group)!;
  const rows = state.bookings.filter((b) => g.has(b.status));
  return (
    <div className="space-y-4">
      <Segmented value={group} onChange={setGroup} options={GROUPS.map((x) => [x.id, `${x.label} (${state.bookings.filter((b) => x.has(b.status)).length})`])} />
      {rows.length === 0 ? (
        <Quiet>No requests here.</Quiet>
      ) : (
        <Panel className="divide-y divide-line overflow-hidden">
          {rows.map((b) => <RequestRow key={b.id} b={b} />)}
        </Panel>
      )}
    </div>
  );
}

function RequestRow({ b }: { b: Booking }) {
  const { state } = useStore();
  const a = state.artisans.find((x) => x.id === b.artisanId);
  return (
    <Link href={`/requests/${b.id}`} className="grid gap-1 px-4 py-3 transition hover:bg-white/[0.04] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6.5rem_12rem] sm:items-center sm:gap-4">
      <span className="min-w-0">
        <span className="block truncate font-bold">{b.title}</span>
        <span className="block truncate text-xs text-muted">{b.customerName} → {a?.businessName ?? "Artisan"}</span>
      </span>
      <span className="truncate text-sm text-slate">{areaLabel(b.areaId)}</span>
      <span className="font-display text-sm font-extrabold sm:text-right">{b.quote ? formatNaira(b.quote.amountKobo) : "No quote"}</span>
      <span className="flex items-center gap-2 sm:justify-end"><StatusPill status={b.status} /><span className="hidden text-xs text-muted lg:inline">{ago(b.createdAt)}</span></span>
    </Link>
  );
}

/* ------------------------------------------------------------------ admin team */

function Team() {
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
    <div className="space-y-4">
      <Panel className="p-5">
        <p className="text-sm text-slate">Add someone by the email they signed up with. They get the admin area as soon as they reload.</p>
        <form
          className="mt-3 flex flex-wrap gap-2"
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
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} !min-h-10 min-w-56 flex-1 !py-2`} placeholder="name@example.com" required maxLength={200} aria-label="Email of the new admin" />
          <Button type="submit" disabled={busy}>Make admin</Button>
        </form>
        <div className="mt-2"><ErrorNote message={err} /></div>
      </Panel>
      <Panel className="divide-y divide-line">
        {rows === null && <p className="px-5 py-4 text-slate">Loading…</p>}
        {rows?.map((r) => (
          <div key={r.userId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div className="min-w-0">
              <p className="font-bold">{r.name} {r.super && <Chip tone="gold">Super admin</Chip>}</p>
              <p className="truncate text-sm text-slate">{r.email}</p>
            </div>
            {!r.super && (
              <Button
                variant="ghost"
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
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ shell */

export default function AdminPage() {
  return (
    <SignedInOnly title="Sign in to the admin area">
      <Admin />
    </SignedInOnly>
  );
}

const TITLES: Record<Section, [string, string]> = {
  overview: ["Overview", "What is happening on Sabihand, and what is waiting on you."],
  disputes: ["Disputes and reports", "Problems raised by customers and artisans. Decide each one right on its card."],
  payouts: ["Payouts", "Released jobs where the artisan has not been paid yet."],
  verification: ["Verification", "Artisans waiting for the team to check them."],
  requests: ["Requests", "Every job on the marketplace. Open one to see its history and chat."],
  team: ["Admin team", "Who can use this admin area."],
};

function Admin() {
  const { state, viewer } = useStore();
  const [section, setSectionRaw] = useState<Section>("overview");
  const [drawer, setDrawer] = useState(false);
  const setSection = (s: Section) => {
    setSectionRaw(s);
    setDrawer(false);
    window.scrollTo({ top: 0 });
  };
  if (!viewer?.isAdmin) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-2xl font-extrabold">This area is for the Sabihand team</h1>
        <p className="mt-2 text-slate">Your account does not have admin access.</p>
        <Link href="/" className="mt-6 inline-block font-bold text-link">Back to Sabihand</Link>
      </div>
    );
  }

  const pending = state.artisans.filter((a) => a.verification.status === "pending");
  const openReports = state.reports.filter((r) => !r.resolvedAt);
  const released = state.payments.filter((p) => p.status === "released");
  const due = released.filter((p) => !p.payout);
  const dueKobo = due.reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const nav: { id: Section; label: string; count?: number; urgent?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "disputes", label: "Disputes", count: openReports.length, urgent: true },
    { id: "payouts", label: "Payouts", count: due.length },
    { id: "verification", label: "Verification", count: pending.length },
    { id: "requests", label: "Requests" },
    ...(viewer.isSuperAdmin ? [{ id: "team" as const, label: "Admin team" }] : []),
  ];

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-6 pt-6">
        <Link href="/" aria-label="Sabihand home"><Logo width={120} /></Link>
        <button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-slate hover:text-ink lg:hidden"><Icon name="close" /></button>
      </div>
      <p className="px-5 pb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">{viewer.isSuperAdmin ? "Super admin" : "Admin"}</p>
      <nav className="grid gap-0.5 px-3" aria-label="Admin">
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => setSection(n.id)}
            aria-current={section === n.id ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold transition ${section === n.id ? "bg-white/10 text-ink" : "text-slate hover:bg-white/5 hover:text-ink"}`}
          >
            <Icon name={n.id} />
            <span className="flex-1">{n.label}</span>
            {!!n.count && <span className={`min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-extrabold ${n.urgent ? "bg-alert text-black" : "bg-gold text-midnight"}`}>{n.count}</span>}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-1 border-t border-line p-3">
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-slate hover:bg-white/5 hover:text-ink">
          <Icon name="site" /> Back to site
        </Link>
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/10 text-sm font-extrabold">{viewer.name.slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{viewer.name}</span>
            <span className="block truncate text-xs text-muted">{viewer.email}</span>
          </span>
        </div>
      </div>
    </div>
  );

  const [title, sub] = TITLES[section];
  return (
    <div className="fixed inset-0 z-40 flex bg-mist text-ink">
      <aside className="hidden w-64 flex-none border-r border-line bg-solid/70 lg:block">{sidebar}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-line bg-solid">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 lg:hidden">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-lg border border-line p-2"><Icon name="menu" /></button>
          <span className="font-extrabold">{viewer.isSuperAdmin ? "Super admin" : "Admin"}</span>
          {openReports.length > 0 && section !== "disputes" && (
            <button onClick={() => setSection("disputes")} className="ml-auto rounded-full bg-alert px-3 py-1 text-xs font-extrabold text-black">{openReports.length} open</button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
              <p className="mt-1 text-slate">{sub}</p>
            </div>
            {section === "overview" && <Overview go={setSection} openReports={openReports} dueKobo={dueKobo} dueCount={due.length} pendingCount={pending.length} />}
            {section === "disputes" && <Disputes />}
            {section === "payouts" && <div className="space-y-3">{due.length === 0 ? <Quiet>Nothing to pay out.</Quiet> : due.map((p) => <PayoutCard key={p.id} id={p.id} />)}</div>}
            {section === "verification" && <div className="space-y-3">{pending.length === 0 ? <Quiet>No artisans waiting. New ones appear here.</Quiet> : pending.map((a) => <VerificationCard key={a.id} id={a.id} />)}</div>}
            {section === "requests" && <Requests />}
            {section === "team" && viewer.isSuperAdmin && <Team />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Overview({ go, openReports, dueKobo, dueCount, pendingCount }: { go: (s: Section) => void; openReports: Report[]; dueKobo: number; dueCount: number; pendingCount: number }) {
  const { state } = useStore();
  const released = state.payments.filter((p) => p.status === "released");
  const gmv = released.reduce((s, p) => s + p.amountKobo, 0);
  const commission = released.reduce((s, p) => s + p.commissionKobo, 0);
  const held = state.payments.filter((p) => p.status === "held").reduce((s, p) => s + p.amountKobo, 0);
  const completed = state.bookings.filter((b) => b.status === "completed").length;
  const queue = [
    { id: "disputes" as const, n: openReports.length, text: "open problems", sub: "Customers and artisans waiting on a decision", tone: "border-alert/50 hover:border-alert" },
    { id: "payouts" as const, n: dueCount, text: "payouts to send", sub: formatNaira(dueKobo), tone: "border-gold/50 hover:border-gold" },
    { id: "verification" as const, n: pendingCount, text: "artisans to verify", sub: "Check their details", tone: "border-gold/50 hover:border-gold" },
  ];
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {queue.map((q) => (
          <button key={q.id} onClick={() => go(q.id)} className={`rounded-2xl border bg-white/[0.03] p-3 text-left transition sm:p-4 ${q.n ? q.tone : "border-line hover:border-white/30"}`}>
            <p className={`font-display text-2xl font-extrabold sm:text-3xl ${q.n ? (q.id === "disputes" ? "text-alert" : "text-gold-ink") : "text-muted"}`}>{q.n}</p>
            <p className="text-sm font-bold leading-tight sm:text-base">{q.text}</p>
            <p className="mt-0.5 hidden text-sm text-slate sm:block">{q.sub}</p>
          </button>
        ))}
      </div>

      {openReports.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold">Waiting on a decision</h2>
            {openReports.length > 2 && <button onClick={() => go("disputes")} className="text-sm font-bold text-link">See all {openReports.length}</button>}
          </div>
          {openReports.slice(0, 2).map((r) => <ReportCard key={r.id} report={r} />)}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Money</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Completed job value" value={formatNaira(gmv)} />
          <Stat label="Commission earned" value={formatNaira(commission)} tone="gold" />
          <Stat label="Held for open jobs" value={formatNaira(held)} />
          <Stat label="To pay out" value={formatNaira(dueKobo)} hint={`${dueCount} ${dueCount === 1 ? "payment" : "payments"}`} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Marketplace</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Artisans" value={state.artisans.filter((a) => !a.sample).length} hint={`${state.artisans.filter((a) => a.verification.status === "verified" && !a.sample).length} verified`} />
          <Stat label="Requests" value={state.bookings.length} />
          <Stat label="Completed jobs" value={completed} />
        </div>
      </section>

      {state.bookings.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold">Latest requests</h2>
            <button onClick={() => go("requests")} className="text-sm font-bold text-link">See all</button>
          </div>
          <Panel className="divide-y divide-line overflow-hidden">
            {[...state.bookings].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 5).map((b) => <RequestRow key={b.id} b={b} />)}
          </Panel>
        </section>
      )}
    </div>
  );
}
