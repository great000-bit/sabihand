"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AREAS, CITIES, TRADES } from "@/lib/seed";
import { Button, inputCls } from "./ui";

export function AreaSelect({ value, onChange, id, allLabel = "Anywhere in Lagos and Abuja" }: { value: string; onChange: (v: string) => void; id?: string; allLabel?: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">{allLabel}</option>
      {CITIES.map((c) => (
        <optgroup key={c} label={c}>
          <option value={`city:${c}`}>All of {c}</option>
          {AREAS.filter((a) => a.city === c).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function SearchForm() {
  const router = useRouter();
  const [trade, setTrade] = useState("plumbing");
  const [area, setArea] = useState("");
  return (
    <form
      className="grid gap-3 rounded-3xl bg-white p-3 shadow-xl sm:grid-cols-[1fr_1.3fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new URLSearchParams({ trade });
        if (area) q.set("area", area);
        router.push(`/artisans?${q.toString()}`);
      }}
    >
      <div>
        <label htmlFor="s-trade" className="sr-only">
          What do you need?
        </label>
        <select id="s-trade" value={trade} onChange={(e) => setTrade(e.target.value)} className={inputCls}>
          {TRADES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.plural}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s-area" className="sr-only">
          Where are you?
        </label>
        <AreaSelect id="s-area" value={area} onChange={setArea} />
      </div>
      <Button type="submit" variant="gold" className="sm:px-8">
        Find artisans
      </Button>
    </form>
  );
}
