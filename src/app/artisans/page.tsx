"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { searchArtisans, type SortKey } from "@/lib/search";
import { LAUNCH_CITIES, TRADES, areaById, areaLabel, stateById } from "@/lib/catalog";
import type { Trade } from "@/lib/types";
import { ArtisanCard } from "@/components/artisan-card";
import { AreaSelect } from "@/components/location-picker";
import { Empty, Field, LinkButton, PageHeader, inputCls } from "@/components/ui";

function Results() {
  const sp = useSearchParams();
  const router = useRouter();
  const { state, config } = useStore();
  const trade = (sp.get("trade") ?? "") as Trade | "";
  // Older links used "city:Lagos"; they now mean the whole state.
  const rawArea = sp.get("area") ?? "";
  const area = rawArea.startsWith("city:") ? `state:${LAUNCH_CITIES.find((c) => c.name === rawArea.slice(5))?.stateId ?? ""}` : rawArea;
  const verifiedOnly = sp.get("verified") === "1";
  const sort = (sp.get("sort") ?? "relevance") as SortKey;

  const params = area.startsWith("state:") ? { stateId: area.slice(6) } : area ? { areaId: area } : {};
  const results = useMemo(() => searchArtisans(state, { trade, verifiedOnly, sort, ...params }), [state, trade, verifiedOnly, sort, area]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(key: string, value: string) {
    const q = new URLSearchParams(sp.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    router.replace(`/artisans?${q.toString()}`);
  }

  const tradeLabel = trade ? TRADES.find((t) => t.id === trade)?.plural : "Artisans";
  const where = area.startsWith("state:") ? (stateById(area.slice(6))?.name ?? "Nigeria") : area ? areaLabel(area) || "Nigeria" : "Nigeria";
  const wholeState = area && !area.startsWith("state:") ? areaById(area)?.stateId : undefined;

  return (
    <div className="space-y-8">
      <PageHeader title={<>{tradeLabel} <span className="text-muted">in {where}</span></>}>
        {results.length} {results.length === 1 ? "artisan" : "artisans"} found. Verified artisans are shown first.
      </PageHeader>

      <div className="grid gap-3 rounded-3xl border-2 border-line bg-surface p-4 sm:grid-cols-[1fr_2.2fr] lg:grid-cols-[1fr_2.2fr_1fr_auto] sm:items-start">
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
        !config.dataAvailable ? (
          <Empty title="Artisans are temporarily unavailable">We could not load artisans just now. Please refresh in a moment.</Empty>
        ) : state.artisans.length === 0 ? (
          <Empty title="We are signing up our first artisans">
            Sabihand is opening in {where}. Be one of the first {tradeLabel?.toLowerCase()} customers will find.
            <div className="mt-5"><LinkButton href="/artisan/join" variant="dark">Create your artisan profile</LinkButton></div>
          </Empty>
        ) : (
          <Empty title="No artisans match yet">
            We have no {tradeLabel?.toLowerCase()} serving {where} yet. Try a wider area, switch off “Verified only”, or look at the whole state.
            {wholeState && <div className="mt-5"><LinkButton href={`/artisans?${new URLSearchParams({ ...(trade ? { trade } : {}), area: `state:${wholeState}` }).toString()}`} variant="dark">Search all of {stateById(wholeState)?.name}</LinkButton></div>}
            <div className="mt-5"><LinkButton href="/artisan/join" variant="ghost">Are you a {tradeLabel?.toLowerCase().replace(/s$/, "")}? Join Sabihand</LinkButton></div>
          </Empty>
        )
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
