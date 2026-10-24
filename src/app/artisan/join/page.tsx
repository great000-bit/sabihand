"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { registerArtisan } from "@/lib/engine";
import { AREAS, TRADES } from "@/lib/seed";
import type { Trade } from "@/lib/types";
import { Button, Card, ErrorNote, Field, inputCls } from "@/components/ui";

export default function Join() {
  const { run } = useStore();
  const router = useRouter();
  const [f, setF] = useState({ name: "", businessName: "", trade: "plumbing" as Trade, bio: "", availability: "", service: "", min: "", max: "" });
  const [areas, setAreas] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const e2 = run((s, c) =>
      registerArtisan(s, { name: f.name, businessName: f.businessName, trade: f.trade, areaIds: areas, bio: f.bio, availability: f.availability, service: { title: f.service, minNaira: Number(f.min), maxNaira: f.max ? Number(f.max) : null } }, c),
    );
    if (e2) return setErr(e2);
    router.push("/artisan");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Join Sabihand as an artisan</h1>
        <p className="mt-1 text-slate">Create your profile in a few minutes. You can add photos and more services after. Verification comes next.</p>
      </div>
      <Card className="p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name"><input value={f.name} onChange={set("name")} className={inputCls} /></Field>
            <Field label="Business name"><input value={f.businessName} onChange={set("businessName")} className={inputCls} /></Field>
          </div>
          <Field label="Your trade">
            <select value={f.trade} onChange={set("trade")} className={inputCls}>
              {TRADES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Areas you serve</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {AREAS.map((a) => (
                <label key={a.id} className="flex min-h-11 items-center gap-2 rounded-2xl border-2 border-line px-3 text-sm font-semibold">
                  <input type="checkbox" className="h-5 w-5 accent-trust" checked={areas.includes(a.id)} onChange={(e) => setAreas(e.target.checked ? [...areas, a.id] : areas.filter((x) => x !== a.id))} />
                  {a.city}: {a.name}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="About your work"><textarea value={f.bio} onChange={set("bio")} rows={3} className={inputCls} /></Field>
          <Field label="When are you available?"><input value={f.availability} onChange={set("availability")} className={inputCls} placeholder="Mon to Sat, 8am to 6pm" /></Field>
          <div className="rounded-2xl bg-mist p-4">
            <p className="mb-3 text-sm font-bold">Your first service and price</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Service"><input value={f.service} onChange={set("service")} className={inputCls} placeholder="Fix a leaking tap" /></Field>
              <Field label="From (₦)"><input inputMode="numeric" value={f.min} onChange={set("min")} className={inputCls} /></Field>
              <Field label="Up to (₦, optional)"><input inputMode="numeric" value={f.max} onChange={set("max")} className={inputCls} /></Field>
            </div>
          </div>
          <ErrorNote message={err} />
          <Button type="submit" className="w-full">Create my profile</Button>
        </form>
      </Card>
    </div>
  );
}
