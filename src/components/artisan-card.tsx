"use client";

import Link from "next/link";
import type { Artisan, Trade } from "@/lib/types";
import { useStore } from "@/lib/store";
import { areaSummary, tradeById } from "@/lib/catalog";
import { formatPriceRange } from "@/lib/money";
import { ratingSummary } from "@/lib/reviews";
import { Chip } from "./ui";
import { Lift } from "./motion";

/** One colour pair per trade, used for avatars and profile covers so each trade reads at a glance. */
export const TRADE_GRADIENT: Record<Trade, [string, string]> = {
  plumbing: ["#1d4ed8", "#38bdf8"],
  electrical: ["#b45309", "#f59e0b"],
  tailoring: ["#86198f", "#f472b6"],
  carpentry: ["#7c2d12", "#d97706"],
  mechanic: ["#334155", "#94a3b8"],
  hairdressing: ["#9d174d", "#fb7185"],
  painting: ["#0f766e", "#5eead4"],
  welding: ["#9a3412", "#fb923c"],
};

export function PinIcon({ className = "h-3.5 w-3.5 flex-none" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function Avatar({ name, size = 52, trade, ring = false, verified = false, photoId }: { name: string; size?: number; trade?: Trade; ring?: boolean; verified?: boolean; photoId?: string }) {
  const [a, b] = trade ? TRADE_GRADIENT[trade] : ["#2250d6", "#0b1f4b"];
  return (
    <span className="relative flex-none" style={{ width: size, height: size }}>
      {photoId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/images/${photoId}`} alt="" width={size} height={size} style={{ width: size, height: size }} className={`rounded-full object-cover ${ring ? "ring-4 ring-[#0b0b0e]" : ""}`} />
      ) : (
        <span
          style={{ width: size, height: size, fontSize: size * 0.4, backgroundImage: `linear-gradient(135deg, ${a}, ${b})` }}
          className={`flex items-center justify-center rounded-full font-display font-extrabold text-white ${ring ? "ring-4 ring-[#0b0b0e]" : ""}`}
        >
          {name.trim()[0]?.toUpperCase()}
        </span>
      )}
      {verified && (
        <span aria-label="Verified" title="Verified" style={{ width: size * 0.3, height: size * 0.3, fontSize: size * 0.18 }} className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-verified font-extrabold text-black ring-2 ring-[#0b0b0e]">
          ✓
        </span>
      )}
    </span>
  );
}

export function RatingLine({ artisanId }: { artisanId: string }) {
  const { state } = useStore();
  const { count, average } = ratingSummary(state.reviews.filter((r) => r.artisanId === artisanId));
  if (average === null) return <Chip>New on Sabihand</Chip>;
  return (
    <span className="text-sm font-bold text-ink">
      <span className="text-gold">★</span> {average.toFixed(1)} <span className="font-medium text-muted">({count})</span>
    </span>
  );
}

export function ArtisanCard({ a, index = 0 }: { a: Artisan; index?: number }) {
  const first = a.services[0];
  const verified = a.verification.status === "verified";
  return (
    <Lift index={index}>
      <Link href={`/artisans/${a.id}`} className="group block h-full">
        <div className="relative h-full overflow-hidden rounded-3xl border border-line bg-surface p-5 backdrop-blur-xl transition-colors group-hover:border-white/30">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40" style={{ background: TRADE_GRADIENT[a.trade][1] }} />
          <div className="relative flex gap-4">
            <Avatar name={a.name} size={60} trade={a.trade} verified={verified} photoId={a.photoId} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-extrabold leading-tight">{a.businessName}</h3>
              {a.sample && <span className="mt-0.5 inline-block rounded-full border border-gold/40 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-gold">Sample profile</span>}
              <p className="truncate text-sm text-slate">
                {tradeById(a.trade).label} · {a.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
                <PinIcon />
                {areaSummary(a.areaIds, 2)}
              </p>
            </div>
            <span className="flex-none self-start whitespace-nowrap">
              <RatingLine artisanId={a.id} />
            </span>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {a.services.slice(0, 3).map((s) => (
              <span key={s.title} className="rounded-full border border-line bg-white/5 px-3 py-1 text-[13px] font-semibold text-slate">
                {s.title}
              </span>
            ))}
            {a.services.length > 3 && <span className="px-1 py-1 text-[13px] font-semibold text-muted">+{a.services.length - 3} more</span>}
          </div>
          <div className="relative mt-4 flex items-end justify-between gap-2 border-t border-line pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">From</p>
              <p className="font-display text-xl font-extrabold">{formatPriceRange(first.minKobo, first.maxKobo)}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-midnight transition group-hover:bg-gold">
              View profile <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </div>
      </Link>
    </Lift>
  );
}
