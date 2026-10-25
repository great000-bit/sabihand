"use client";

import Link from "next/link";
import type { Artisan } from "@/lib/types";
import { useStore } from "@/lib/store";
import { areaSummary, tradeById } from "@/lib/catalog";
import { formatPriceRange } from "@/lib/money";
import { ratingSummary } from "@/lib/reviews";
import { Card, Chip, VerifiedBadge } from "./ui";

export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.4 }} className="flex flex-none items-center justify-center rounded-full bg-trust font-display font-extrabold text-white">
      {name.trim()[0]}
    </span>
  );
}

export function RatingLine({ artisanId }: { artisanId: string }) {
  const { state } = useStore();
  const { count, average } = ratingSummary(state.reviews.filter((r) => r.artisanId === artisanId));
  if (average === null) return <Chip>New on Sabihand</Chip>;
  return (
    <span className="text-sm font-bold text-ink">
      ★ {average.toFixed(1)} <span className="font-medium text-muted">({count} {count === 1 ? "review" : "reviews"})</span>
    </span>
  );
}

export function ArtisanCard({ a }: { a: Artisan }) {
  const first = a.services[0];
  const areas = areaSummary(a.areaIds, 2);
  return (
    <Link href={`/artisans/${a.id}`} className="block">
      <Card className="p-5 transition hover:border-ink">
        <div className="flex gap-4">
          <Avatar name={a.name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="truncate text-lg font-extrabold">{a.businessName}</h3>
              <VerifiedBadge v={a.verification} />
            </div>
            <p className="text-sm text-slate">
              {tradeById(a.trade).label} · {a.name} · {areas}
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{first.title}</p>
                <p className="font-display text-xl font-extrabold">{formatPriceRange(first.minKobo, first.maxKobo)}</p>
              </div>
              <RatingLine artisanId={a.id} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
