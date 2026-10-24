"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { searchArtisans, type SortKey } from "@/lib/search";
import { TRADES, areaById } from "@/lib/seed";
import type { Trade } from "@/lib/types";
import { ArtisanCard } from "@/components/artisan-card";
import { AreaSelect } from "@/components/search-form";
import { Empty, Field, inputCls } from "@/components/ui";

function Results() {
  const sp = useSearchParams();
  const router = useRouter();
  const { state } = useStore();
  const trade = (sp.get("trade") ?? "") as Trade | "";
  const area = sp.get("area") ?? "";
  const verifiedOnly = sp.get("verified") === "1";
  const sort = (sp.get("sort") ?? "relevance") as SortKey;

  const params = area.startsWith("city:") ? { city: area.slice(5) } : area ? { areaId: area } : {};
  const results = useMemo(() => searchArtisans(state, { trade, verifiedOnly, sort, ...params }), [state, trade, verifiedOnly, sort, area]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(key: string, value: string) {
    const q = new URLSearchParams(sp.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    router.replace(`/artisans?${q.toString()}`);
  }

  const tradeLabel = trade ? TRADES.find((t) => t.id === trade)?.plural : "Artisans";
  const where = area.startsWith("city:") ? area.slice(5) : area ? areaById(area)?.name : "Lagos and Abuja";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">
          {tradeLabel} <span className="text-muted">in {where}</span>
        </h1>
        <p className="mt-1 text-slate">
          {results.length} {results.length === 1 ? "artisan" : "artisans"} found. Verified artisans are shown first.
        </p>
      </div>

      <div className="grid gap-3 rounded-3xl border-2 border-line bg-white p-4 sm:grid-cols-[1fr_1.3fr_1fr_auto] sm:items-end">
        <Field label="Trade">
          <select value={trade} onChange={(e) => set("trade", e.target.value)} className={inputCls}>
            <option value="">All trades</option>
            {TRADES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.plural}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Area">
          <AreaSelect value={area} onChange={(v) => set("area", v)} />
        </Field>
        <Field label="Sort by">
          <select value={sort} onChange={(e) => set("sort", e.target.value)} className={inputCls}>
            <option value="relevance">Verified first</option>
            <option value="price_low">Lowest starting price</option>
            <option value="rating">Highest rated</option>
          </select>
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => set("verified", e.target.checked ? "1" : "")} className="h-5 w-5 accent-trust" />
          Verified only
        </label>
      </div>

      {results.length === 0 ? (
        <Empty title="No artisans match yet">
          We have no {tradeLabel?.toLowerCase()} serving {where} yet. Try another area, switch off “Verified only”, or look at all of the city.
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((a) => (
            <ArtisanCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArtisansPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-muted">Loading artisans…</p>}>
      <Results />
    </Suspense>
  );
}
