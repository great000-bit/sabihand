"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { searchArtisans, type SortKey } from "@/lib/search";
import { LAUNCH_NAME, TRADES, areaLabel, isLaunchArea } from "@/lib/catalog";
import type { Trade } from "@/lib/types";
import { SignedInOnly } from "@/components/gate";
import { ArtisanCard } from "@/components/artisan-card";
import { AreaSelect } from "@/components/location-picker";
import { Empty, Field, LinkButton, PageHeader, inputCls } from "@/components/ui";

function Results() {
  const sp = useSearchParams();
  const router = useRouter();
  const { state, config } = useStore();
  const trade = (sp.get("trade") ?? "") as Trade | "";
  // Older links used a city or a whole state; they now mean all of the launch city.
  const rawArea = sp.get("area") ?? "";
  const area = isLaunchArea(rawArea) ? rawArea : "";
  const verifiedOnly = sp.get("verified") === "1";
  const sort = (sp.get("sort") ?? "relevance") as SortKey;

  const params = area ? { areaId: area } : { launchOnly: true };
  const results = useMemo(() => searchArtisans(state, { trade, verifiedOnly, sort, ...params }), [state, trade, verifiedOnly, sort, area]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(key: string, value: string) {
    const q = new URLSearchParams(sp.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    router.replace(`/artisans?${q.toString()}`);
  }

  const tradeLabel = trade ? TRADES.find((t) => t.id === trade)?.plural : "Artisans";
  const where = area ? areaLabel(area).replace(/, Rivers$/, "") || LAUNCH_NAME : LAUNCH_NAME;

  return (
    <div className="space-y-8">
      <PageHeader title={<>{tradeLabel} <span className="text-muted">in {where}</span></>}>
        {results.length} {results.length === 1 ? "artisan" : "artisans"} found. Verified artisans are shown first.
      </PageHeader>

      <div className="z-20 sm:sticky sm:top-[4.75rem] -mx-1 space-y-3 rounded-3xl border border-line bg-black/55 p-3 backdrop-blur-xl sm:p-4">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Trade">
          {[{ id: "", plural: "All trades" }, ...TRADES].map((t) => {
            const on = trade === t.id;
            return (
              <button key={t.id || "all"} role="tab" aria-selected={on} onClick={() => set("trade", t.id)} className={`flex-none rounded-full px-4 py-2 text-sm font-extrabold transition ${on ? "bg-white text-midnight" : "border border-line text-slate hover:border-white/40 hover:text-ink"}`}>
                {t.plural}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-[2.2fr_1fr_auto] sm:items-end">
          <Field label="Where">
            <AreaSelect value={area} onChange={(v) => set("area", v)} />
          </Field>
          <Field label="Sort by">
            <select value={sort} onChange={(e) => set("sort", e.target.value)} className={inputCls}>
              <option value="relevance">Verified first</option>
              <option value="price_low">Lowest starting price</option>
              <option value="rating">Highest rated</option>
            </select>
          </Field>
          <button type="button" role="switch" aria-checked={verifiedOnly} onClick={() => set("verified", verifiedOnly ? "" : "1")} className="flex min-h-11 items-center gap-3 rounded-full border border-line px-4 text-sm font-extrabold">
            <span className={`relative h-6 w-10 rounded-full transition ${verifiedOnly ? "bg-verified" : "bg-white/20"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${verifiedOnly ? "left-[1.1rem]" : "left-0.5"}`} />
            </span>
            Verified only
          </button>
        </div>
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
            We have no {tradeLabel?.toLowerCase()} serving {where} yet. Try all of {LAUNCH_NAME}, or switch off “Verified only”.
            {area && <div className="mt-5"><LinkButton href={`/artisans?${new URLSearchParams(trade ? { trade } : {}).toString()}`} variant="dark">Search all of {LAUNCH_NAME}</LinkButton></div>}
            <div className="mt-5"><LinkButton href="/artisan/join" variant="ghost">Are you a {tradeLabel?.toLowerCase().replace(/s$/, "")}? Join Sabihand</LinkButton></div>
          </Empty>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((a, i) => (
            <ArtisanCard key={a.id} a={a} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArtisansPage() {
  return (
    <SignedInOnly title="Sign in to find artisans">
      <Suspense fallback={<p className="py-12 text-center text-muted">Loading artisans…</p>}>
        <Results />
      </Suspense>
    </SignedInOnly>
  );
}
