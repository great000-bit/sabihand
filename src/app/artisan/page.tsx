"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import * as actions from "@/server/actions";
import { isOpen, STATUS_LABEL } from "@/lib/booking";
import { ProfilePhotos } from "@/components/photo-tools";
import { SignedInOnly } from "@/components/gate";
import { Avatar } from "@/components/artisan-card";
import { Button, Card, ErrorNote, Field, LinkButton, StatusPill, inputCls } from "@/components/ui";
import { UnreadPill } from "@/components/chat-panel";
import { useUnread } from "@/lib/unread";
import { artisanPayoutKobo, formatNaira, formatNairaShort } from "@/lib/money";
import { ratingSummary } from "@/lib/reviews";
import { areaLabel, tradeById } from "@/lib/catalog";
import { ROTATE_MS, greetingAt } from "@/lib/greetings";
import type { Artisan, Booking } from "@/lib/types";
import { PayoutAccount } from "./payout";

/* ------------------------------------------------------------------ look */

const glass = "rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.015))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl";

const PATHS = {
  overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  jobs: <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M3.5 8.5A2.5 2.5 0 0 1 6 6h12a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5zM3.5 12.5h17" />,
  reviews: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  photos: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 15.5 16 11l-8.5 8" /></>,
  payout: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></>,
  verify: <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM8.5 12l2.5 2.5 4.5-5" />,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4" /><rect x="4" y="9" width="16.5" height="10" rx="2.5" /><path d="M16 14h.01" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  share: <path d="M8.5 10.5l7-4M8.5 13.5l7 4M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  search: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />,
  inbox: <path d="M3.5 13.5 6 5h12l2.5 8.5V19H3.5zM3.5 13.5H9l1 2h4l1-2h5.5" />,
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
} satisfies Record<string, ReactNode>;

function I({ n, className = "h-5 w-5" }: { n: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[n]}
    </svg>
  );
}

type View = "overview" | "jobs" | "reviews" | "photos" | "payout" | "verify";
const VIEWS: View[] = ["overview", "jobs", "reviews", "photos", "payout", "verify"];

/* ------------------------------------------------------------------ greeting */

/** "Good morning, Ada" in English, Yorùbá, Igbo, Hausa, Pidgin and Ikwerre, a new language every 30 seconds. */
function Greeting({ name }: { name: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // Start on the clock (not at render) so the server and browser agree, then change on each 30-second boundary.
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      t = setTimeout(tick, ROTATE_MS - (Date.now() % ROTATE_MS) + 20);
    };
    tick();
    return () => clearTimeout(t);
  }, []);
  const g = now === null ? { language: "English", text: "Welcome back" } : greetingAt(now, new Date(now).getHours());
  return (
    <h1 className="text-[28px] font-extrabold leading-tight sm:text-4xl" aria-live="off">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={g.text}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          className="inline-block"
          lang={{ Yorùbá: "yo", Igbo: "ig", Hausa: "ha", Pidgin: "pcm", Ikwerre: "ikw" }[g.language] ?? "en"}
          title={g.language}
        >
          <span className="bg-[linear-gradient(100deg,#F6D27A,#E3A92B_55%,#C78B1C)] bg-clip-text text-transparent">{g.text}</span>
          <span className="text-ink">, {name}</span>
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}

/* ------------------------------------------------------------------ pieces */

function HeroCard({ tone = "glass", icon, title, sub, value, badge, foot, onFoot }: { tone?: "gold" | "glass"; icon: keyof typeof PATHS; title: string; sub: string; value: string; badge?: ReactNode; foot: string; onFoot: () => void }) {
  const gold = tone === "gold";
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-[22px] ${gold ? "bg-[linear-gradient(135deg,#F4C95A_0%,#E3A92B_45%,#B57A14_100%)] text-midnight shadow-[0_30px_70px_-30px_rgba(227,169,43,0.65)]" : glass}`}>
      {gold && <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(circle_at_top_right,black,transparent_70%)]" />}
      <div className="relative flex items-start gap-3 p-5">
        <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${gold ? "bg-white/90 text-midnight" : "bg-white/[0.08] text-gold"}`}>
          <I n={icon} />
        </span>
        <span className="min-w-0">
          <span className="block text-[17px] font-bold leading-tight">{title}</span>
          <span className={`block text-[13px] ${gold ? "text-midnight/70" : "text-muted"}`}>{sub}</span>
        </span>
      </div>
      <div className="relative flex flex-wrap items-center gap-2 px-5 pb-5">
        <span className="font-display text-[34px] font-extrabold leading-none tracking-tight">{value}</span>
        {badge}
      </div>
      <button onClick={onFoot} className={`relative mt-auto flex items-center justify-between px-5 py-3 text-sm font-semibold transition ${gold ? "bg-white/20 hover:bg-white/30" : "border-t border-white/[0.06] bg-white/[0.03] text-slate hover:bg-white/[0.06] hover:text-ink"}`}>
        {foot}
        <I n="arrow" className="h-4 w-4" />
      </button>
    </div>
  );
}

function Mini({ icon, label, value, note, tone }: { icon: keyof typeof PATHS; label: string; value: number; note: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] ${tone}`}><I n={icon} className="h-4 w-4" /></span>
        {label}
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold">{value}</p>
      <p className={`mt-1 text-xs ${value ? tone : "text-muted"}`}>{note}</p>
    </div>
  );
}

/** Money in by month for the last six months, the current month picked out in gold. */
function EarningsChart({ jobs, payments }: { jobs: Booking[]; payments: { bookingId: string; amountKobo: number; status: string; createdAt: string }[] }) {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const total = payments
        .filter((p) => p.status !== "refunded" && jobs.some((b) => b.id === p.bookingId))
        .filter((p) => {
          const c = new Date(p.createdAt);
          return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
        })
        .reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
      return { label: d.toLocaleDateString("en-NG", { month: "short" }), total, current: i === 5 };
    });
  }, [jobs, payments]);
  const max = Math.max(...months.map((m) => m.total), 1);
  const sum = months.reduce((s, m) => s + m.total, 0);
  const [pick, setPick] = useState(5);
  const shown = months[pick];
  return (
    <div className={`${glass} flex flex-col p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Money in, last 6 months</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{formatNaira(sum)}</p>
        </div>
        <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-midnight">After commission</span>
      </div>
      <div className="relative mt-6 grid h-52 grid-cols-6 items-end gap-2.5 sm:gap-4" role="list" aria-label="Earnings by month">
        {months.map((m, i) => {
          const h = sum ? Math.max(6, Math.round((m.total / max) * 100)) : [38, 52, 30, 64, 46, 72][i];
          const on = i === pick;
          return (
            <button
              key={m.label}
              role="listitem"
              onClick={() => setPick(i)}
              onMouseEnter={() => setPick(i)}
              aria-label={`${m.label}: ${formatNaira(m.total)}`}
              className="group relative flex h-full flex-col justify-end"
            >
              <span
                style={{ height: `${h}%` }}
                className={`relative block w-full rounded-t-xl rounded-b-md transition-all duration-500 ${on ? "bg-[linear-gradient(180deg,#F4C95A,#E3A92B_55%,rgba(227,169,43,0.15))] shadow-[0_0_40px_-8px_rgba(227,169,43,0.7)]" : sum ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03))] group-hover:bg-white/15" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01))]"}`}
              >
                {on && (
                  <span className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#141518] px-2.5 py-1.5 text-[11px] font-semibold shadow-xl">
                    {formatNairaShort(m.total)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2.5 text-center text-xs text-muted sm:gap-4">
        {months.map((m, i) => <span key={m.label} className={i === pick ? "font-semibold text-ink" : ""}>{m.label}</span>)}
      </div>
      <p className="mt-3 text-xs text-muted">{sum ? `${shown.label}: ${formatNaira(shown.total)} paid in by customers (your share, held or released).` : "Your earnings appear here as customers pay for jobs."}</p>
    </div>
  );
}

const FILTERS = [
  ["all", "All"],
  ["new", "New"],
  ["active", "Active"],
  ["finished", "Finished"],
] as const;
type Filter = (typeof FILTERS)[number][0];

function JobsTable({ jobs, initial = "all", title = "Recent jobs", limit }: { jobs: Booking[]; initial?: Filter; title?: string; limit?: number }) {
  const [f, setF] = useState<Filter>(initial);
  const [q, setQ] = useState("");
  const unread = useUnread().byBooking;
  const rows = jobs
    .filter((b) => (f === "new" ? b.status === "pending_response" : f === "active" ? isOpen(b.status) && b.status !== "pending_response" : f === "finished" ? !isOpen(b.status) : true))
    .filter((b) => !q || `${b.title} ${b.customerName} ${areaLabel(b.areaId)}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, limit);
  return (
    <div className={`${glass} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-3 p-5">
        <h2 className="mr-auto text-lg font-bold">{title}</h2>
        <label className="relative">
          <span className="sr-only">Search jobs</span>
          <I n="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-10 w-44 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-[15px] outline-none placeholder:text-muted focus:border-gold/60 sm:w-56" />
        </label>
        <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1" role="tablist">
          {FILTERS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={f === id} onClick={() => setF(id)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${f === id ? "bg-gold text-midnight" : "text-slate hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-white/[0.06] px-5 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-gold"><I n="inbox" /></span>
          <p className="font-semibold">{q ? "No jobs match that search." : f === "new" ? "No new requests right now." : "No jobs here yet."}</p>
          <p className="max-w-sm text-sm text-muted">Share your profile link on WhatsApp and Instagram so customers near you can find you.</p>
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-y border-white/[0.06] bg-white/[0.03] text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Job</th>
              <th className="hidden px-3 py-3 font-semibold md:table-cell">Customer</th>
              <th className="hidden px-3 py-3 font-semibold lg:table-cell">Area</th>
              <th className="hidden px-3 py-3 font-semibold sm:table-cell">Date</th>
              <th className="px-3 py-3 text-right font-semibold">Amount</th>
              <th className="px-5 py-3 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((b) => (
              <tr key={b.id} className="group cursor-pointer transition hover:bg-white/[0.03]">
                <td className="px-5 py-3.5">
                  <Link href={`/requests/${b.id}`} className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/[0.06] text-xs font-extrabold text-gold">{tradeById(b.trade).label[0]}</span>
                    <span className="min-w-0 max-w-[16rem] sm:max-w-[20rem]">
                      <span className="block truncate font-semibold group-hover:text-gold">{b.title}</span>
                      <span className="block truncate text-xs text-muted md:hidden">{b.customerName}</span>
                    </span>
                    <UnreadPill n={unread[b.id] ?? 0} />
                  </Link>
                </td>
                <td className="hidden px-3 py-3.5 text-slate md:table-cell">{b.customerName}</td>
                <td className="hidden max-w-40 truncate px-3 py-3.5 text-slate lg:table-cell">{areaLabel(b.areaId)}</td>
                <td className="hidden whitespace-nowrap px-3 py-3.5 text-slate sm:table-cell">{new Date(b.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold">{b.quote ? formatNaira(b.quote.amountKobo) : <span className="text-muted">—</span>}</td>
                <td className="px-5 py-3.5 text-right"><span title={STATUS_LABEL[b.status]}><StatusPill status={b.status} /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ sections */

function Reviews({ me }: { me: Artisan }) {
  const { state, act, busy } = useStore();
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const reviews = state.reviews.filter((r) => r.artisanId === me.id);
  if (reviews.length === 0)
    return (
      <div className={`${glass} flex flex-col items-center gap-2 px-5 py-14 text-center`}>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-gold"><I n="reviews" /></span>
        <p className="font-semibold">No reviews yet</p>
        <p className="max-w-sm text-sm text-muted">Reviews appear after a customer confirms a finished job.</p>
      </div>
    );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2"><ErrorNote message={err} /></div>
      {reviews.map((r) => (
        <div key={r.id} className={`${glass} p-5`}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{r.customerName}</p>
            <p className="text-gold" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-white/15">{"★".repeat(5 - r.rating)}</span></p>
          </div>
          {r.text && <p className="mt-2 text-slate">{r.text}</p>}
          {reporting === r.id ? (
            <div className="mt-3 space-y-2">
              <Field label="Why is this review unfair or false?"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={inputCls} /></Field>
              <div className="flex gap-2">
                <Button variant="danger" disabled={busy} onClick={async () => { const e = await act(() => actions.reportReview(r.id, reason)); setErr(e); if (!e) { setReporting(null); setReason(""); } }}>Send report</Button>
                <Button variant="ghost" onClick={() => setReporting(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button className="mt-3 text-xs font-bold text-muted hover:text-gold" onClick={() => setReporting(r.id)}>Report this review</button>
          )}
        </div>
      ))}
    </div>
  );
}

function Verification({ me }: { me: Artisan }) {
  const { act, busy } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const v = me.verification;
  const steps = [
    ["Phone number", "We call or text the number on your profile."],
    ["Valid ID", "NIN slip, voter's card, driver's licence or passport."],
    ["Address", "Where you work or live."],
    ["Bank account", "Your payout account name must match your name."],
  ];
  return (
    <div className={`${glass} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className={`text-xs font-bold uppercase tracking-[0.2em] ${v.status === "verified" ? "text-verified" : "text-gold"}`}>{v.status === "verified" ? "Verified" : v.status === "pending" ? "Under review" : v.status === "rejected" ? "Not approved" : "Not verified"}</p>
          <h2 className="mt-2 text-2xl font-extrabold">{v.status === "verified" ? "You are verified" : v.status === "pending" ? "The team is checking your details" : "Get the verified badge"}</h2>
          <p className="mt-1 text-slate">{v.status === "verified" ? "Customers see your badge and you are shown first in search." : v.status === "rejected" ? v.note ?? "Update your details and apply again." : "Verified artisans are shown first in search and get more requests."}</p>
        </div>
        {v.status !== "pending" && v.status !== "verified" && (
          <button disabled={busy} onClick={async () => setErr(await act(() => actions.submitVerification(me.id)))} className="min-h-11 rounded-xl bg-gold px-5 font-bold text-midnight transition hover:brightness-110 disabled:opacity-60">Submit for verification</button>
        )}
      </div>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/[0.07] text-sm font-bold text-gold">{v.status === "verified" ? <I n="check" className="h-4 w-4" /> : i + 1}</span>
            <span><span className="block font-semibold">{t}</span><span className="block text-sm text-muted">{d}</span></span>
          </li>
        ))}
      </ol>
      <div className="mt-3"><ErrorNote message={err} /></div>
    </div>
  );
}

/* ------------------------------------------------------------------ dashboard */

function Dashboard() {
  const { state, me } = useStore();
  const [view, setViewState] = useState<View>("overview");
  const [copied, setCopied] = useState(false);
  // Keep the open section in the address (#jobs, #payout ...) so the browser's Back button and shared links work.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1) as View;
      setViewState(VIEWS.includes(h) ? h : "overview");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const setView = (v: View) => {
    window.history.pushState(null, "", v === "overview" ? window.location.pathname : `#${v}`);
    setViewState(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
  const toConfirm = jobs.filter((b) => b.status === "in_progress" && b.artisanMarkedDoneAt);
  const done = jobs.filter((b) => b.status === "completed");
  const mine = state.payments.filter((p) => jobs.some((b) => b.id === p.bookingId));
  const released = mine.filter((p) => p.status === "released").reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const paidOut = mine.filter((p) => p.payout).reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const held = mine.filter((p) => p.status === "held").reduce((s, p) => s + artisanPayoutKobo(p.amountKobo), 0);
  const reviews = state.reviews.filter((r) => r.artisanId === me.id);
  const { count, average } = ratingSummary(reviews);
  const v = me.verification;
  const first = me.name.trim().split(/\s+/)[0] || me.businessName;
  const share = async () => {
    const url = `${window.location.origin}/artisans/${me.id}`;
    try {
      if (navigator.share) await navigator.share({ title: me.businessName, text: `Book ${me.businessName} on Sabihand`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  };

  const nav: { id: View; label: string; icon: keyof typeof PATHS; count?: number; dot?: boolean }[] = [
    { id: "overview", label: "Overview", icon: "overview" },
    { id: "jobs", label: "Jobs", icon: "jobs", count: incoming.length },
    { id: "reviews", label: "Reviews", icon: "reviews", count: reviews.length || undefined },
    { id: "photos", label: "Photos", icon: "photos", dot: !me.photoId },
    { id: "payout", label: "Payout account", icon: "payout", dot: !me.bank },
    { id: "verify", label: "Verification", icon: "verify", dot: v.status !== "verified" && v.status !== "pending" },
  ];
  const TITLES: Record<View, [string, string]> = {
    overview: ["", ""],
    jobs: ["Jobs", "Every request and job, newest first. Open one to quote, chat and update it."],
    reviews: ["Reviews", "What customers said after their jobs."],
    photos: ["Photos", "A clear face photo and pictures of finished work help people choose you."],
    payout: ["Payout account", "Where your earnings are paid."],
    verify: ["Verification", "Earn the badge customers look for."],
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="hidden lg:block">
        <div className={`${glass} sticky top-28 flex flex-col gap-5 p-4`}>
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2.5">
            <Avatar name={me.name} size={40} trade={me.trade} photoId={me.photoId} verified={v.status === "verified"} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{me.businessName}</span>
              <span className="block truncate text-xs text-muted">{tradeById(me.trade).label}</span>
            </span>
          </div>
          <nav aria-label="Dashboard" className="grid gap-0.5">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Menu</p>
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                aria-current={view === n.id ? "page" : undefined}
                className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition ${view === n.id ? "border border-white/10 bg-white/[0.08] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "border border-transparent text-slate hover:bg-white/[0.04] hover:text-ink"}`}
              >
                <I n={n.icon} className={`h-[18px] w-[18px] ${view === n.id ? "text-gold" : ""}`} />
                <span className="flex-1">{n.label}</span>
                {n.count ? <span className="min-w-5 rounded-full bg-white px-1.5 py-0.5 text-center text-[11px] font-bold text-midnight">{n.count}</span> : n.dot ? <span className="h-2 w-2 rounded-full bg-gold" aria-label="Needs attention" /> : null}
              </button>
            ))}
          </nav>
          <div className="rounded-2xl border border-white/[0.07] bg-[radial-gradient(120%_90%_at_50%_0%,rgba(227,169,43,0.2),transparent_70%)] p-4">
            {v.status === "verified" ? (
              <>
                <p className="font-bold">Grow your bookings</p>
                <p className="mt-1 text-xs text-slate">Share your profile where your customers already are.</p>
                <button onClick={share} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-bold text-midnight hover:brightness-110"><I n="share" className="h-4 w-4" />{copied ? "Link copied" : "Share profile"}</button>
              </>
            ) : (
              <>
                <p className="font-bold">{v.status === "pending" ? "Verification in review" : "Get verified ✦"}</p>
                <p className="mt-1 text-xs text-slate">Verified artisans are shown first and get more requests.</p>
                <button onClick={() => setView("verify")} className="mt-3 flex h-9 w-full items-center justify-center rounded-xl bg-gold text-sm font-bold text-midnight hover:brightness-110">{v.status === "pending" ? "See status" : "Start now"}</button>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        {/* Phone menu */}
        <nav aria-label="Dashboard" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} aria-current={view === n.id ? "page" : undefined} className={`flex flex-none items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${view === n.id ? "border-gold/50 bg-gold text-midnight" : "border-white/10 bg-white/[0.04] text-slate"}`}>
              <I n={n.icon} className="h-4 w-4" />
              {n.label}
              {n.count ? <span className={`rounded-full px-1.5 text-[11px] font-bold ${view === n.id ? "bg-midnight text-gold" : "bg-white text-midnight"}`}>{n.count}</span> : null}
            </button>
          ))}
        </nav>

        {view === "overview" ? (
          <>
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <Greeting name={first} />
                <p className="mt-1 text-slate">Here is how {me.businessName} is doing today.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={share} className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold hover:bg-white/[0.08]"><I n="share" className="h-4 w-4" />{copied ? "Copied" : "Share"}</button>
                <Link href={`/artisans/${me.id}`} className="flex h-11 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-midnight hover:brightness-110"><I n="eye" className="h-4 w-4" />Public profile</Link>
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
              <HeroCard
                tone="gold"
                icon="wallet"
                title="Earned"
                sub="After the Sabihand commission"
                value={formatNaira(released)}
                badge={paidOut > 0 ? <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold">{formatNairaShort(paidOut)} paid out</span> : undefined}
                foot={me.bank ? "Payout account" : "Add payout account"}
                onFoot={() => setView("payout")}
              />
              <HeroCard icon="lock" title="Held for you" sub="Released when the customer confirms" value={formatNaira(held)} foot="See active jobs" onFoot={() => setView("jobs")} />
              <HeroCard
                icon="reviews"
                title="Rating"
                sub={count ? `${count} ${count === 1 ? "review" : "reviews"}` : "No reviews yet"}
                value={average === null ? "New" : average.toFixed(1)}
                badge={average !== null ? <span className="text-sm text-gold">{"★".repeat(Math.round(average))}</span> : undefined}
                foot="Read reviews"
                onFoot={() => setView("reviews")}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
              <div className={`${glass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Your jobs</h2>
                    <p className="text-xs text-muted">Where every job stands right now</p>
                  </div>
                  <button onClick={() => setView("jobs")} className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gold px-3 text-xs font-bold text-midnight hover:brightness-110">Open jobs <I n="arrow" className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Mini icon="inbox" label="New" value={incoming.length} note={incoming.length ? "Waiting for your quote" : "Nothing waiting"} tone="text-gold" />
                  <Mini icon="bolt" label="Active" value={active.length} note={active.length ? "In progress or paid" : "No active jobs"} tone="text-sky-300" />
                  <Mini icon="clock" label="To confirm" value={toConfirm.length} note={toConfirm.length ? "Customer to confirm" : "None pending"} tone="text-violet-300" />
                  <Mini icon="check" label="Completed" value={done.length} note={done.length ? "Jobs finished" : "Your first is coming"} tone="text-emerald-300" />
                </div>
              </div>
              <EarningsChart jobs={jobs} payments={state.payments} />
            </div>

            {(!me.photoId || !me.bank || v.status === "unverified" || v.status === "rejected") && (
              <div className={`${glass} flex flex-wrap items-center gap-4 p-5`}>
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gold/15 text-gold"><I n="bolt" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Finish your profile to get more requests</p>
                  <p className="text-sm text-muted">
                    {[!me.photoId && "add a profile photo", !me.bank && "add your payout account", (v.status === "unverified" || v.status === "rejected") && "get verified"].filter(Boolean).join(", ").replace(/^./, (c) => c.toUpperCase())}.
                  </p>
                </div>
                <button onClick={() => setView(!me.photoId ? "photos" : !me.bank ? "payout" : "verify")} className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold hover:bg-white/[0.1]">Continue</button>
              </div>
            )}

            <JobsTable jobs={jobs} limit={6} />
          </>
        ) : (
          <>
            <header>
              <h1 className="text-3xl font-extrabold">{TITLES[view][0]}</h1>
              <p className="mt-1 text-slate">{TITLES[view][1]}</p>
            </header>
            {view === "jobs" && <JobsTable jobs={jobs} title="All jobs" initial={incoming.length ? "new" : "all"} />}
            {view === "reviews" && <Reviews me={me} />}
            {view === "photos" && <ProfilePhotos me={me} />}
            {view === "payout" && <PayoutAccount me={me} />}
            {view === "verify" && <Verification me={me} />}
          </>
        )}
      </div>
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
