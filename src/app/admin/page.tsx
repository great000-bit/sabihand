"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import * as actions from "@/server/actions";
import { addAdmin, listAdmins, removeAdmin, type AdminRow } from "@/server/admin-actions";
import { areaLabel, areaSummary, tradeById } from "@/lib/catalog";
import { artisanPayoutKobo, formatNaira } from "@/lib/money";
import type { AppState, Booking, BookingStatus, Report, VerificationCheck } from "@/lib/types";
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

/** Small line icons, drawn on a 24px grid. */
const ICONS = {
  overview: <path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z" />,
  disputes: <path d="M12 3 2.5 20h19zM12 10v4M12 17.5v.01" />,
  payouts: <path d="M3 7h18v12H3zM3 11h18M7 15h3" />,
  verification: <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM8.5 12l2.5 2.5 4.5-5" />,
  requests: <path d="M8 4h8l1 2h3v15H4V6h3zM8 11h8M8 15h5" />,
  team: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.7 3 5.2" />,
  site: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  help: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01" />,
  search: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  panel: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></>,
  arrow: <path d="M7 17 17 7M9 7h8v8" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
} satisfies Record<string, ReactNode>;

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

/** The one card surface of the admin area. */
function Box({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[1.25rem] border border-white/[0.07] bg-[#111215] ${className}`}>{children}</div>;
}

function BoxHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-4">
      <h2 className="text-[15px] font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <Box className="px-5 py-10 text-center text-sm text-slate">{children}</Box>;
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="tablist" className="inline-flex max-w-full overflow-x-auto rounded-full border border-white/[0.07] bg-[#111215] p-1">
      {options.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)} className={`min-h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${value === id ? "bg-gold text-midnight" : "text-slate hover:text-ink"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ numbers */

const GROUPS: { id: string; label: string; colour: string; has: (s: BookingStatus) => boolean }[] = [
  { id: "new", label: "New", colour: "#e3a92b", has: (s) => s === "pending_response" || s === "accepted" || s === "awaiting_payment" },
  { id: "active", label: "In progress", colour: "#8fb0ff", has: (s) => s === "confirmed" || s === "in_progress" },
  { id: "disputed", label: "Problems", colour: "#ff8f82", has: (s) => s === "disputed" },
  { id: "done", label: "Closed", colour: "#52d39b", has: (s) => s === "completed" || s === "cancelled" || s === "declined" },
];

/** Paid-out and refunded money for each of the last twelve months, oldest first. */
function monthly(state: AppState) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-NG", { month: "short" }), released: 0, refunded: 0 };
  });
  const index = new Map(months.map((m, i) => [m.key, i]));
  for (const p of state.payments) {
    if (p.status === "held") continue;
    const d = new Date(p.settledAt ?? p.createdAt);
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i === undefined) continue;
    if (p.status === "released") months[i].released += p.amountKobo;
    else months[i].refunded += p.amountKobo;
  }
  return months;
}

/** Released money above the line, refunds below it, one pair of bars a month. */
function CashChart({ state }: { state: AppState }) {
  const months = monthly(state);
  const top = Math.max(1, ...months.map((m) => m.released));
  const bottom = Math.max(1, ...months.map((m) => m.refunded));
  const W = 600, H = 210, mid = H * (top / (top + bottom * 0.6 + 1)) * 0.9 + 8;
  const up = mid - 10, down = H - mid - 8;
  const step = W / months.length;
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? months.length - 1;
  return (
    <div className="relative px-5 pb-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted">Paid to artisans, last 12 months</p>
          <p className="font-display text-2xl font-bold">{formatNaira(months.reduce((s, m) => s + m.released, 0))}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" /> Released</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/40" /> Refunded</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="h-auto w-full" role="img" aria-label="Money released and refunded each month">
        <line x1="0" x2={W} y1={mid} y2={mid} stroke="rgb(255 255 255 / 0.08)" />
        {months.map((m, i) => {
          const x = i * step + step / 2;
          const hu = m.released ? Math.max(4, (m.released / top) * up) : 2;
          const hd = m.refunded ? Math.max(4, (m.refunded / bottom) * down) : 0;
          const on = i === shown;
          return (
            <g key={m.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * step} y="0" width={step} height={H} fill="transparent" />
              <rect x={x - 9} y={mid - hu} width="18" height={hu} rx="5" fill="#e3a92b" opacity={on ? 1 : 0.75} />
              {hd > 0 && <rect x={x - 9} y={mid + 3} width="18" height={hd} rx="5" fill="rgb(255 255 255 / 0.35)" />}
              <text x={x} y={H + 14} textAnchor="middle" fontSize="11" fill={on ? "#f5f5f7" : "#8d8f9b"}>{m.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute right-5 top-16 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs backdrop-blur">
        <p className="font-bold">{months[shown].label}</p>
        <p className="text-slate">Released <b className="text-ink">{formatNaira(months[shown].released)}</b></p>
        <p className="text-slate">Refunded <b className="text-ink">{formatNaira(months[shown].refunded)}</b></p>
      </div>
    </div>
  );
}

function Donut({ state }: { state: AppState }) {
  const parts = GROUPS.map((g) => ({ ...g, n: state.bookings.filter((b) => g.has(b.status)).length }));
  const total = parts.reduce((s, p) => s + p.n, 0);
  const R = 52, C = 2 * Math.PI * R;
  let start = 0;
  return (
    <div className="px-5 pb-5">
      <div className="relative mx-auto mt-2 h-40 w-40">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="16" />
          {total > 0 &&
            parts.map((p) => {
              const len = (p.n / total) * C;
              const el = p.n ? <circle key={p.id} cx="70" cy="70" r={R} fill="none" stroke={p.colour} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 3)} ${C}`} strokeDashoffset={-start} strokeLinecap="round" /> : null;
              start += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] text-muted">All requests</p>
          <p className="font-display text-2xl font-bold">{total}</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 text-sm">
        {parts.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-black" style={{ background: p.colour }}>{total ? Math.round((p.n / total) * 100) : 0}%</span>
            <span className="flex-1 text-slate">{p.label}</span>
            <b>{p.n}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ disputes and reports */

/**
 * One reported problem with everything needed to decide it, and the decision buttons on the card itself.
 * A job problem settles the held money; a reported review is hidden or kept; anything else is simply closed.
 */
function ReportCard({ report: r, flat = false }: { report: Report; flat?: boolean }) {
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

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {open ? <Chip tone="alert">Open</Chip> : <Chip tone="green">Resolved</Chip>}
            <span className="text-xs font-semibold text-muted">{r.kind === "booking" ? "Job problem" : r.kind === "review" ? "Reported review" : "Reported artisan"} · {ago(r.createdAt)}</span>
          </div>
          <h3 className="mt-2 text-lg font-bold">{title}</h3>
        </div>
        {pay && (
          <div className="sm:text-right">
            <p className="font-display text-xl font-bold">{formatNaira(pay.amountKobo)}</p>
            <p className="text-xs text-muted">{pay.status === "held" ? "Held by Sabihand" : pay.status === "released" ? "Already paid to artisan" : "Refunded"}</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 px-5 py-4 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted">What {r.reporterName} said</p>
            <p className="mt-1 whitespace-pre-line rounded-xl bg-alert-soft px-3 py-2 text-[15px]">{r.reason}</p>
          </div>
          {review && (
            <div>
              <p className="text-xs font-semibold text-muted">The review ({review.rating}★ by {review.customerName})</p>
              <p className="mt-1 rounded-xl bg-white/5 px-3 py-2 text-[15px] text-slate">{review.text || "No text, rating only."}</p>
            </div>
          )}
          {r.resolution && <p className="text-sm text-slate"><b className="text-ink">Outcome:</b> {r.resolution}</p>}
        </div>
        {b && (
          <dl className="grid grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted">Customer</dt>
            <dd className="font-semibold">{b.customerName}{own === "customer" && <span className="ml-1 text-gold">(you)</span>}</dd>
            <dt className="text-muted">Artisan</dt>
            <dd className="font-semibold">{a?.businessName ?? "Unknown"}{a?.phone ? <span className="font-normal text-slate"> · {a.phone}</span> : null}{own === "artisan" && <span className="ml-1 text-gold">(you)</span>}</dd>
            <dt className="text-muted">Where</dt>
            <dd>{areaLabel(b.areaId) || "Not given"}</dd>
            <dt className="text-muted">Status</dt>
            <dd><StatusPill status={b.status} /></dd>
          </dl>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-white/[0.07] px-5 py-4">
          {r.kind !== "review" && (
            <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} !min-h-10 !rounded-xl !border !py-2 text-[15px]`} placeholder="Note on your decision (optional, both sides can see it)" maxLength={1000} aria-label="Decision note" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {r.kind === "booking" && disputed && !confirm && (
              <>
                <Button variant="gold" disabled={busy} onClick={() => setConfirm("release")}>Release payment to artisan</Button>
                <Button variant="danger" disabled={busy} onClick={() => setConfirm("refund")}>Refund customer</Button>
              </>
            )}
            {confirm && b && (
              <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-gold-soft px-3 py-2">
                <p className="mr-auto text-sm font-semibold">
                  {confirm === "release" ? `Pay ${a?.businessName ?? "the artisan"} and close this dispute?` : `Refund ${b.customerName} and close this dispute?`}
                  {confirm === "refund" && pay?.status === "released" && " The money was already paid out, so send the refund by hand."}
                </p>
                <Button variant={confirm === "refund" ? "danger" : "gold"} disabled={busy} onClick={() => run(() => actions.resolveDispute(b.id, confirm, note))}>{busy ? "Saving..." : "Yes, confirm"}</Button>
                <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button>
              </div>
            )}
            {r.kind === "review" && (
              <>
                <Button variant="danger" disabled={busy} onClick={() => run(() => actions.moderateReview(r.id, true))}>Hide review</Button>
                <Button variant="ghost" disabled={busy} onClick={() => run(() => actions.moderateReview(r.id, false))}>Keep review</Button>
              </>
            )}
            {(r.kind === "artisan" || (r.kind === "booking" && !disputed)) && <Button variant="gold" disabled={busy} onClick={() => run(() => actions.closeReport(r.id, note))}>Mark as resolved</Button>}
            {b && !confirm && (
              <Link href={`/requests/${b.id}`} className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-link hover:underline">
                Open job and chat <Icon name="arrow" className="h-4 w-4" />
              </Link>
            )}
          </div>
          <ErrorNote message={err} />
        </div>
      )}
    </>
  );
  return flat ? <div>{body}</div> : <Box className={open ? "border-alert/25" : ""}>{body}</Box>;
}

/** The full card for one report, opened from a row on the overview. */
function ReportDrawer({ report, onClose }: { report: Report; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Decide this report">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#0d0e10]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <p className="font-bold">Decide this report</p>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate hover:text-ink"><Icon name="close" /></button>
        </div>
        <div className="flex-1 overflow-y-auto pb-6">
          <ReportCard report={report} flat />
        </div>
      </div>
    </div>
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

/* ------------------------------------------------------------------ payouts and verification */

function PayoutCard({ id }: { id: string }) {
  const { state, act, busy } = useStore();
  const p = state.payments.find((x) => x.id === id)!;
  const b = state.bookings.find((x) => x.id === p.bookingId);
  const a = state.artisans.find((x) => x.id === b?.artisanId);
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Box className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">{a?.businessName ?? "Artisan"} <span className="font-normal text-muted">· {b?.title}</span></h3>
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
          <p className="font-display text-2xl font-bold">{formatNaira(artisanPayoutKobo(p.amountKobo))}</p>
          <p className="text-xs text-muted">after commission</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={ref} onChange={(e) => setRef(e.target.value)} className={`${inputCls} !min-h-10 min-w-56 flex-1 !rounded-xl !border !py-2`} placeholder="Transfer reference" maxLength={80} aria-label="Transfer reference" />
        <Button variant="gold" disabled={busy || !a?.bank} onClick={async () => setErr(await act(() => actions.markPaidOut(p.id, ref)))}>Mark as paid</Button>
      </div>
      <div className="mt-2"><ErrorNote message={err} /></div>
    </Box>
  );
}

function VerificationCard({ id }: { id: string }) {
  const { state, act, busy } = useStore();
  const a = state.artisans.find((x) => x.id === id)!;
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Box className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold">{a.businessName}</h3>
          <p className="text-sm text-slate">{tradeById(a.trade).label} · {a.name} · {areaSummary(a.areaIds, 3)}</p>
          <p className="text-sm text-slate">Phone: <b className="text-ink">{a.phone}</b> · <Link href={`/artisans/${a.id}`} className="font-semibold text-link">View profile</Link></p>
        </div>
        <VerifiedBadge v={a.verification} />
      </div>
      <p className="mt-4 text-sm font-semibold">Tick only the checks you actually did</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {CHECKS.map((c) => (
          <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-semibold has-[:checked]:border-gold has-[:checked]:bg-gold-soft">
            <input type="checkbox" className="h-5 w-5 accent-[#e3a92b]" checked={checks.includes(c.id)} onChange={(e) => setChecks(e.target.checked ? [...checks, c.id] : checks.filter((x) => x !== c.id))} />
            {c.label}
          </label>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} mt-3 !min-h-10 !rounded-xl !border !py-2`} placeholder="Note to the artisan if you reject (optional)" aria-label="Note" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="gold" disabled={busy} onClick={async () => setErr(await act(() => actions.decideVerification(a.id, "verified", checks, note)))}>Approve</Button>
        <Button variant="danger" disabled={busy} onClick={async () => setErr(await act(() => actions.decideVerification(a.id, "rejected", [], note)))}>Reject</Button>
      </div>
      <div className="mt-2"><ErrorNote message={err} /></div>
    </Box>
  );
}

/* ------------------------------------------------------------------ requests */

function RequestTable({ rows }: { rows: Booking[] }) {
  const { state } = useStore();
  return (
    <div className="overflow-x-auto px-2 pb-2">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="px-3 py-2 font-medium">Job</th>
            <th className="px-3 py-2 font-medium">Artisan</th>
            <th className="px-3 py-2 font-medium">Where</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-white/[0.06] hover:bg-white/[0.03]">
              <td className="px-3 py-2.5">
                <Link href={`/requests/${b.id}`} className="block font-semibold hover:text-gold">{b.title}</Link>
                <span className="text-xs text-muted">{b.customerName}</span>
              </td>
              <td className="px-3 py-2.5 text-slate">{state.artisans.find((a) => a.id === b.artisanId)?.businessName ?? "Artisan"}</td>
              <td className="px-3 py-2.5 text-slate">{areaLabel(b.areaId)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate">{new Date(b.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</td>
              <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{b.quote ? formatNaira(b.quote.amountKobo) : <span className="text-muted">No quote</span>}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap"><StatusPill status={b.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Requests() {
  const { state } = useStore();
  const [group, setGroup] = useState("all");
  const all = { id: "all", label: "All", colour: "", has: () => true };
  const g = [all, ...GROUPS].find((x) => x.id === group)!;
  const rows = [...state.bookings].filter((b) => g.has(b.status)).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  return (
    <div className="space-y-4">
      <Segmented value={group} onChange={setGroup} options={[all, ...GROUPS].map((x) => [x.id, `${x.label} (${state.bookings.filter((b) => x.has(b.status)).length})`])} />
      {rows.length === 0 ? <Quiet>No requests here.</Quiet> : <Box className="pt-2"><RequestTable rows={rows} /></Box>}
    </div>
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
      <Box className="p-5">
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
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} !min-h-10 min-w-56 flex-1 !rounded-xl !border !py-2`} placeholder="name@example.com" required maxLength={200} aria-label="Email of the new admin" />
          <Button type="submit" variant="gold" disabled={busy}>Make admin</Button>
        </form>
        <div className="mt-2"><ErrorNote message={err} /></div>
      </Box>
      <Box className="divide-y divide-white/[0.06]">
        {rows === null && <p className="px-5 py-4 text-slate">Loading…</p>}
        {rows?.map((r) => (
          <div key={r.userId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div className="min-w-0">
              <p className="font-semibold">{r.name} {r.super && <Chip tone="gold">Super admin</Chip>}</p>
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
      </Box>
    </div>
  );
}

/* ------------------------------------------------------------------ search */

/** Finds jobs and artisans by title, customer, business or artisan name. */
function Search() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const hits = useMemo(() => {
    if (term.length < 2) return [];
    const jobs = state.bookings
      .filter((b) => [b.title, b.customerName, state.artisans.find((a) => a.id === b.artisanId)?.businessName ?? ""].some((s) => s.toLowerCase().includes(term)))
      .slice(0, 5)
      .map((b) => ({ href: `/requests/${b.id}`, title: b.title, sub: `Request · ${b.customerName}` }));
    const people = state.artisans
      .filter((a) => [a.businessName, a.name, a.phone].some((s) => s.toLowerCase().includes(term)))
      .slice(0, 4)
      .map((a) => ({ href: `/artisans/${a.id}`, title: a.businessName, sub: `Artisan · ${tradeById(a.trade).label}` }));
    return [...jobs, ...people];
  }, [term, state]);
  return (
    <div className="relative w-full max-w-xs">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs and artisans" aria-label="Search jobs and artisans" className="h-10 w-full rounded-full border border-white/[0.08] bg-[#111215] pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-gold/60 focus:outline-none" />
      {term.length >= 2 && (
        <div className="absolute right-0 top-12 z-30 w-full min-w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#141518] shadow-2xl">
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate">Nothing matches “{q}”.</p>
          ) : (
            hits.map((h) => (
              <Link key={h.href} href={h.href} className="block px-4 py-2.5 hover:bg-white/5">
                <span className="block truncate text-sm font-semibold">{h.title}</span>
                <span className="block text-xs text-muted">{h.sub}</span>
              </Link>
            ))
          )}
        </div>
      )}
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
  overview: ["Dashboard", "Run the marketplace: money, problems and people in one place."],
  disputes: ["Disputes", "Problems raised by customers and artisans. Decide each one on its card."],
  payouts: ["Payouts", "Released jobs where the artisan has not been paid yet."],
  verification: ["Verification", "Artisans waiting for the team to check them."],
  requests: ["Requests", "Every job on the marketplace. Open one to see its history and chat."],
  team: ["Admin team", "Who can use this admin area."],
};

// Desktop sidebar open/closed, remembered per browser.
const RAIL_KEY = "sabihand-admin-rail";
const railListeners = new Set<() => void>();
function readRail() {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}
function setRail(v: boolean) {
  try {
    localStorage.setItem(RAIL_KEY, v ? "1" : "0");
  } catch {}
  railListeners.forEach((l) => l());
}
function useRail() {
  return useSyncExternalStore(
    (l) => {
      railListeners.add(l);
      return () => railListeners.delete(l);
    },
    readRail,
    () => false,
  );
}

function Admin() {
  const { state, viewer } = useStore();
  const [section, setSectionRaw] = useState<Section>("overview");
  const [drawer, setDrawer] = useState(false);
  const rail = useRail();
  const [deciding, setDeciding] = useState<string | null>(null);
  const setSection = (s: Section) => {
    setSectionRaw(s);
    setDrawer(false);
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
  const due = state.payments.filter((p) => p.status === "released" && !p.payout);
  const deciding_ = deciding ? state.reports.find((r) => r.id === deciding) : undefined;
  const sidebar = (compact: boolean) => {
    const item = (n: { id: Section; label: string; count?: number; urgent?: boolean }) => (
      <button
        key={n.id}
        onClick={() => setSection(n.id)}
        aria-current={section === n.id ? "page" : undefined}
        aria-label={compact ? n.label : undefined}
        title={compact ? n.label : undefined}
        className={`relative flex min-h-10 w-full items-center gap-3 rounded-xl text-left text-sm font-medium transition ${compact ? "justify-center px-0" : "px-3"} ${section === n.id ? "bg-white/[0.08] text-ink" : "text-slate hover:bg-white/[0.04] hover:text-ink"}`}
      >
        <Icon name={n.id} className={`h-[18px] w-[18px] ${section === n.id ? "text-gold" : ""}`} />
        {!compact && <span className="flex-1">{n.label}</span>}
        {!!n.count &&
          (compact ? (
            <span className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${n.urgent ? "bg-alert" : "bg-gold"}`} />
          ) : (
            <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${n.urgent ? "bg-alert text-black" : "bg-gold text-midnight"}`}>{n.count}</span>
          ))}
      </button>
    );
    const link = (href: string, icon: keyof typeof ICONS, label: string) => (
      <Link href={href} aria-label={compact ? label : undefined} title={compact ? label : undefined} className={`flex min-h-10 items-center gap-3 rounded-xl text-sm font-medium text-slate hover:bg-white/[0.04] hover:text-ink ${compact ? "justify-center" : "px-3"}`}>
        <Icon name={icon} className="h-[18px] w-[18px]" />
        {!compact && label}
      </Link>
    );
    const heading = (t: string) => (compact ? <div className="mx-auto mb-2 h-px w-6 bg-white/10" /> : <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">{t}</p>);
    return (
    <div className={`flex h-full flex-col gap-5 overflow-y-auto ${compact ? "items-stretch px-3 py-4" : "p-4"}`}>
      <div className={`flex items-center pt-1 ${compact ? "justify-center" : "justify-between px-1"}`}>
        <Link href="/" aria-label="Sabihand home">
          {compact ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/icon-midnight-gold.svg" alt="" className="h-9 w-9 rounded-xl" />
          ) : (
            <Logo width={118} />
          )}
        </Link>
        {!compact && <button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-slate hover:text-ink lg:hidden"><Icon name="close" /></button>}
      </div>
      <div className={`flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] ${compact ? "justify-center p-1.5" : "p-2.5"}`} title={compact ? viewer.name : undefined}>
        {viewer.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={viewer.image} alt="" className="h-9 w-9 flex-none rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gold font-bold text-midnight">{viewer.name.slice(0, 1).toUpperCase()}</span>
        )}
        {!compact && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{viewer.name}</span>
            <span className="block truncate text-xs text-muted">{viewer.isSuperAdmin ? "Super admin" : "Admin"} account</span>
          </span>
        )}
      </div>
      <div>
        {heading("Main menu")}
        <nav className="grid gap-0.5" aria-label="Admin">
          {item({ id: "overview", label: "Dashboard" })}
          {item({ id: "disputes", label: "Disputes", count: openReports.length, urgent: true })}
          {item({ id: "payouts", label: "Payouts", count: due.length })}
          {item({ id: "verification", label: "Verification", count: pending.length })}
          {item({ id: "requests", label: "Requests" })}
        </nav>
      </div>
      <div>
        {heading("Preference")}
        <div className="grid gap-0.5">
          {viewer.isSuperAdmin && item({ id: "team", label: "Admin team" })}
          {link("/disputes", "help", "Dispute policy")}
          {link("/", "site", "Back to site")}
        </div>
      </div>
      {!compact && <div className="mt-auto rounded-2xl border border-white/[0.07] bg-[radial-gradient(120%_90%_at_50%_0%,rgba(227,169,43,0.18),transparent_70%)] p-4 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-midnight"><Icon name="verification" /></span>
        <p className="mt-3 font-bold">{pending.length ? `${pending.length} artisan${pending.length === 1 ? "" : "s"} to verify` : "Everyone is checked"}</p>
        <p className="mt-1 text-xs text-slate">Verified artisans get more requests and build trust.</p>
        <button onClick={() => setSection("verification")} className="mt-3 h-9 w-full rounded-full bg-white text-sm font-bold text-midnight hover:brightness-95">Open queue</button>
      </div>}
    </div>
    );
  };

  const [title, sub] = TITLES[section];
  return (
    <div className="fixed inset-0 z-40 flex bg-[#08090a] text-ink">
      <aside className={`hidden flex-none overflow-hidden border-r border-white/[0.06] bg-[#0d0e10] transition-[width] duration-300 ease-out lg:block ${rail ? "w-[76px]" : "w-64"}`}>{sidebar(rail)}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-white/10 bg-[#0d0e10]">{sidebar(false)}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-xl border border-white/10 p-2 lg:hidden"><Icon name="menu" /></button>
          <button onClick={() => setRail(!rail)} aria-label={rail ? "Open sidebar" : "Close sidebar"} aria-expanded={!rail} title={rail ? "Open sidebar" : "Close sidebar"} className="hidden rounded-xl border border-white/10 p-2 text-slate transition hover:bg-white/[0.04] hover:text-ink lg:block"><Icon name="panel" /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{title}</h1>
            <p className="hidden truncate text-xs text-muted sm:block">“{sub}”</p>
          </div>
          <div className="hidden md:block"><Search /></div>
          {openReports.length > 0 && (
            <button onClick={() => setSection("disputes")} className="flex h-10 items-center gap-1.5 rounded-full border border-alert/30 bg-alert-soft px-3 text-xs font-bold text-alert">
              <Icon name="disputes" className="h-4 w-4" /> {openReports.length}<span className="hidden sm:inline"> open</span>
            </button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1360px] p-4 sm:p-6">
            <div className="mb-4 md:hidden"><Search /></div>
            {section === "overview" && <Overview go={setSection} decide={setDeciding} />}
            {section === "disputes" && <Disputes />}
            {section === "payouts" && <div className="space-y-3">{due.length === 0 ? <Quiet>Nothing to pay out.</Quiet> : due.map((p) => <PayoutCard key={p.id} id={p.id} />)}</div>}
            {section === "verification" && <div className="space-y-3">{pending.length === 0 ? <Quiet>No artisans waiting. New ones appear here.</Quiet> : pending.map((a) => <VerificationCard key={a.id} id={a.id} />)}</div>}
            {section === "requests" && <Requests />}
            {section === "team" && viewer.isSuperAdmin && <Team />}
          </div>
        </main>
      </div>
      {deciding_ && <ReportDrawer report={deciding_} onClose={() => setDeciding(null)} />}
    </div>
  );
}

function Overview({ go, decide }: { go: (s: Section) => void; decide: (id: string) => void }) {
  const { state } = useStore();
  const released = state.payments.filter((p) => p.status === "released");
  const gmv = released.reduce((s, p) => s + p.amountKobo, 0);
  const commission = released.reduce((s, p) => s + p.commissionKobo, 0);
  const held = state.payments.filter((p) => p.status === "held");
  const heldKobo = held.reduce((s, p) => s + p.amountKobo, 0);
  const due = released.filter((p) => !p.payout);
  const dueKobo = due.reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const openReports = state.reports.filter((r) => !r.resolvedAt);
  const paidJobs = new Set(state.payments.map((p) => p.bookingId)).size;
  const problemJobs = new Set(state.reports.filter((r) => r.kind === "booking").map((r) => r.targetId)).size;
  const score = paidJobs ? Math.round(100 * (1 - problemJobs / paidJobs)) : null;
  const scoreLabel = score === null ? "No paid jobs yet" : score >= 90 ? "Excellent" : score >= 75 ? "Good" : "Needs care";
  const artisans = state.artisans.filter((a) => !a.sample);
  const latest = [...state.bookings].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 6);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* Money held: the one bright card, like a balance */}
      <div className="relative overflow-hidden rounded-[1.25rem] bg-gold p-5 text-midnight lg:col-span-4">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[28px] border-white/25" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-48 w-48 rounded-full border-[22px] border-white/15" />
        <div className="relative">
          <p className="text-sm font-semibold">Held by Sabihand</p>
          <p className="mt-1 font-display text-4xl font-bold tracking-tight">{formatNaira(heldKobo)}</p>
          <p className="text-sm opacity-75">{held.length} {held.length === 1 ? "job" : "jobs"} in progress</p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => go("payouts")} className="h-10 flex-1 rounded-full bg-white px-4 text-sm font-bold hover:brightness-95">Payouts {due.length ? `(${due.length})` : ""}</button>
            <button onClick={() => go("disputes")} className="h-10 flex-1 rounded-full bg-midnight px-4 text-sm font-bold text-white hover:bg-midnight-2">Disputes {openReports.length ? `(${openReports.length})` : ""}</button>
          </div>
        </div>
      </div>

      {/* Money in three numbers */}
      <Box className="lg:col-span-5">
        <BoxHead title="Earnings" />
        <div className="grid grid-cols-3 gap-2 p-4">
          {[
            ["Completed jobs", formatNaira(gmv)],
            ["Commission", formatNaira(commission)],
            ["To pay out", formatNaira(dueKobo)],
          ].map(([l, v], i) => (
            <div key={l} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs text-muted">{l}</p>
              <p className={`mt-2 truncate font-display text-lg font-bold ${i === 1 ? "text-gold" : ""}`}>{v}</p>
            </div>
          ))}
        </div>
      </Box>

      {/* Trust score */}
      <Box className="lg:col-span-3">
        <BoxHead title="Trust score" />
        <div className="px-5 pb-5 pt-2">
          <p className="text-xs text-muted">Paid jobs without a problem</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="font-display text-2xl font-bold">{scoreLabel}</p>
            {score !== null && <p className="font-display text-2xl font-bold text-gold">{score}%</p>}
          </div>
          <div className="mt-3 flex h-3 gap-1">
            <div className="rounded-full bg-gold" style={{ width: `${score ?? 0}%` }} />
            <div className="flex-1 rounded-full bg-white/10" />
          </div>
        </div>
      </Box>

      {/* Money over time */}
      <Box className="lg:col-span-7">
        <BoxHead title="Cashflow"><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate">This year</span></BoxHead>
        <CashChart state={state} />
      </Box>

      {/* Problems waiting on a decision, each one click from its full card */}
      <Box className="flex flex-col lg:col-span-5">
        <BoxHead title="Waiting on you">{openReports.length > 0 && <button onClick={() => go("disputes")} className="text-xs font-semibold text-link">See all</button>}</BoxHead>
        <div className="flex-1 p-3">
          {openReports.length === 0 ? (
            <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-verified-soft text-verified"><Icon name="verification" /></span>
              <p className="mt-3 font-semibold">No open problems</p>
              <p className="text-sm text-slate">Disputes from customers and artisans show up here.</p>
            </div>
          ) : (
            <ul className="grid gap-2">
              {openReports.slice(0, 4).map((r) => {
                const b = r.kind === "booking" ? state.bookings.find((x) => x.id === r.targetId) : undefined;
                const pay = b ? state.payments.find((p) => p.bookingId === b.id) : undefined;
                return (
                  <li key={r.id}>
                    <button onClick={() => decide(r.id)} className="w-full rounded-2xl border border-alert/20 bg-alert-soft/40 p-3 text-left transition hover:border-alert/50">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{b?.title ?? (r.kind === "review" ? "Reported review" : "Reported artisan")}</span>
                          <span className="line-clamp-1 text-xs text-slate">{r.reporterName}: {r.reason}</span>
                        </span>
                        {pay && <span className="whitespace-nowrap font-display text-sm font-bold">{formatNaira(pay.amountKobo)}</span>}
                      </span>
                      <span className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-muted">{ago(r.createdAt)}</span>
                        <span className="font-bold text-gold">Decide →</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Box>

      {/* Latest requests */}
      <Box className="lg:col-span-7">
        <BoxHead title="Recent requests"><button onClick={() => go("requests")} className="text-xs font-semibold text-link">See all</button></BoxHead>
        {latest.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate">No requests yet.</p> : <div className="pt-2"><RequestTable rows={latest} /></div>}
      </Box>

      {/* Requests by status */}
      <Box className="lg:col-span-2 xl:col-span-2 lg:min-w-0">
        <BoxHead title="Statistic" />
        <Donut state={state} />
      </Box>

      {/* People */}
      <Box className="lg:col-span-3">
        <BoxHead title="Artisans" />
        <div className="space-y-3 p-5 pt-3">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-3xl font-bold">{artisans.length}</p>
            <p className="text-sm text-slate">{artisans.filter((a) => a.verification.status === "verified").length} verified</p>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {[...artisans].sort((x, y) => y.joinedAt.localeCompare(x.joinedAt)).slice(0, 4).map((a) => (
              <li key={a.id}>
                <Link href={`/artisans/${a.id}`} className="flex items-center justify-between gap-2 py-2 hover:text-gold">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{a.businessName}</span>
                    <span className="block truncate text-xs text-muted">{tradeById(a.trade).label} · {ago(a.joinedAt)}</span>
                  </span>
                  <span className="flex-none whitespace-nowrap"><VerifiedBadge v={a.verification} /></span>
                </Link>
              </li>
            ))}
          </ul>
          <button onClick={() => go("verification")} className="h-10 w-full rounded-full border border-white/10 text-sm font-semibold hover:border-gold/50">Verification queue</button>
        </div>
      </Box>
    </div>
  );
}
