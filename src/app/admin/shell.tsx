"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/chrome";
import { ICONS, Icon, Quiet, Search, type Section } from "./parts";
import { adminSignOut } from "@/server/admin-auth/actions";

const TITLES: Record<Section, [string, string]> = {
  overview: ["Dashboard", "Run the marketplace: money, problems and people in one place."],
  disputes: ["Disputes", "Problems raised by customers and artisans. Decide each one on its card."],
  payouts: ["Payouts", "Released jobs where the artisan has not been paid yet."],
  verification: ["Verification", "Artisans waiting for the team to check them."],
  requests: ["Requests", "Every job on the marketplace. Open one to see its history and chat."],
  artisans: ["Artisans", "Everyone offering work on Sabihand. Open one to see their jobs, money and checks."],
  autopilot: ["Autopilot", "The admin bot: switch it on or off and tell it exactly what it may do."],
  team: ["Admin team", "Who can use this admin area."],
  security: ["Security", "Your password, two-step sign-in, open sessions and the sign-in log."],
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

/** Which sidebar item a path belongs to, and whether it is a detail page inside it. */
function sectionOf(path: string): { section: Section; detail: boolean } {
  const [, , first, second] = path.split("/");
  const known: Section[] = ["disputes", "payouts", "verification", "requests", "artisans", "autopilot", "team", "security"];
  const section = (known as string[]).includes(first ?? "") ? (first as Section) : "overview";
  return { section, detail: Boolean(second) };
}

const DETAIL_TITLES: Partial<Record<Section, [string, string]>> = {
  requests: ["Request", "The job, its money, any problem, the history and the chat."],
  artisans: ["Artisan", "Contact, checks, bank, jobs and reviews for one artisan."],
};

/** The admin frame every /admin page sits in: sidebar (rail on desktop, drawer on phones) and top bar. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { state, viewer } = useStore();
  const path = usePathname();
  const { section, detail } = sectionOf(path);
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const drawer = drawerAt === path; // a new page closes the phone menu by itself
  const setDrawer = (open: boolean) => setDrawerAt(open ? path : null);
  const rail = useRail();
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
  const sidebar = (compact: boolean) => {
    const item = (n: { id: Section; label: string; count?: number; urgent?: boolean }) => (
      <Link
        key={n.id}
        href={n.id === "overview" ? "/admin" : `/admin/${n.id}`}
        onClick={() => setDrawer(false)}
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
      </Link>
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
          {item({ id: "artisans", label: "Artisans" })}
          {item({ id: "autopilot", label: "Autopilot" })}
        </nav>
      </div>
      <div>
        {heading("Preference")}
        <div className="grid gap-0.5">
          {viewer.isSuperAdmin && item({ id: "team", label: "Admin team" })}
          {item({ id: "security", label: "Security" })}
          {link("/disputes", "help", "Dispute policy")}
          {link("/", "site", "Back to site")}
          <button
            onClick={async () => {
              await adminSignOut();
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = "/";
            }}
            aria-label={compact ? "Sign out of admin" : undefined}
            title={compact ? "Sign out of admin" : undefined}
            className={`flex min-h-10 items-center gap-3 rounded-xl text-sm font-medium text-slate hover:bg-white/[0.04] hover:text-alert ${compact ? "justify-center" : "px-3"}`}
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
            {!compact && "Sign out of admin"}
          </button>
        </div>
      </div>
      {!compact && <div className="mt-auto rounded-2xl border border-white/[0.07] bg-[radial-gradient(120%_90%_at_50%_0%,rgba(227,169,43,0.18),transparent_70%)] p-4 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-midnight"><Icon name="verification" /></span>
        <p className="mt-3 font-bold">{pending.length ? `${pending.length} artisan${pending.length === 1 ? "" : "s"} to verify` : "Everyone is checked"}</p>
        <p className="mt-1 text-xs text-slate">Verified artisans get more requests and build trust.</p>
        <Link href="/admin/verification" onClick={() => setDrawer(false)} className="mt-3 flex h-9 w-full items-center justify-center rounded-full bg-white text-sm font-bold text-midnight hover:brightness-95">Open queue</Link>
      </div>}
    </div>
    );
  };

  const [title, sub] = (detail && DETAIL_TITLES[section]) || TITLES[section];
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
            <Link href="/admin/disputes" className="flex h-10 items-center gap-1.5 rounded-full border border-alert/30 bg-alert-soft px-3 text-xs font-bold text-alert">
              <Icon name="disputes" className="h-4 w-4" /> {openReports.length}<span className="hidden sm:inline"> open</span>
            </Link>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1360px] p-4 sm:p-6">
            <div className="mb-4 md:hidden"><Search /></div>
            {section === "team" && !viewer.isSuperAdmin ? <Quiet>Only a super admin can manage the admin team.</Quiet> : children}
          </div>
        </main>
      </div>
    </div>
  );
}

