"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { registerArtisan } from "@/server/actions";
import { LAUNCH_AREAS, LAUNCH_NAME, MAX_AREAS, TRADES, areaLabel } from "@/lib/catalog";
import { LocateButton } from "@/components/location-picker";
import { SignedInOnly } from "@/components/gate";
import type { Trade } from "@/lib/types";
import { Button, Card, ErrorNote, Field, LinkButton, PageHeader, inputCls } from "@/components/ui";

function JoinForm() {
  const { viewer, me, act, busy } = useStore();
  const router = useRouter();
  const [f, setF] = useState({ name: viewer?.name ?? "", businessName: "", phone: "", trade: "plumbing" as Trade, bio: "", availability: "", service: "", min: "", max: "" });
  const [areas, setAreas] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (me) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-3xl font-extrabold">You already have a profile</h1>
        <p className="mt-2 text-slate">{me.businessName} is live. Manage your requests from your jobs page.</p>
        <div className="mt-6 flex justify-center"><LinkButton href="/artisan">Go to my jobs</LinkButton></div>
      </Card>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const error = await act(() => registerArtisan({ ...f, areaIds: areas, minNaira: Number(f.min), maxNaira: f.max ? Number(f.max) : null }));
    if (error) return setErr(error);
    router.push("/artisan");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Join Sabihand as an artisan">Create your profile in a few minutes. It is free; Sabihand takes a commission only when a job is completed. Verification comes next.</PageHeader>
      <Card className="p-6 sm:p-9">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name"><input value={f.name} onChange={set("name")} className={inputCls} required maxLength={80} /></Field>
            <Field label="Business name"><input value={f.businessName} onChange={set("businessName")} className={inputCls} required maxLength={80} placeholder="e.g. Bello Electricals" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your trade">
              <select value={f.trade} onChange={set("trade")} className={inputCls}>
                {TRADES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Phone number" hint="Customers see it only after they pay you.">
              <input type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} className={inputCls} required placeholder="0803 123 4567" />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-bold">Areas you serve</legend>
            <p className="mb-3 text-sm text-slate">Sabihand is launching in {LAUNCH_NAME}. Tick where you work, or let your phone find the nearest area.</p>
            <LocateButton onFound={(a) => setAreas((cur) => (cur.includes(a.id) || cur.length >= MAX_AREAS ? cur : [...cur, a.id]))} />
            {(() => {
              const allOn = LAUNCH_AREAS.every((a) => areas.includes(a.id));
              return (
                <div className="mt-3 space-y-3">
                  <button type="button" className="min-h-10 rounded-full px-3 text-sm font-bold text-link underline-offset-2 hover:underline" onClick={() => setAreas(allOn ? areas.filter((id) => !LAUNCH_AREAS.some((a) => a.id === id)) : [...new Set([...areas, ...LAUNCH_AREAS.map((a) => a.id)])].slice(0, MAX_AREAS))}>
                    {allOn ? `Clear all of ${LAUNCH_NAME}` : `Select all of ${LAUNCH_NAME}`}
                  </button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {LAUNCH_AREAS.map((a) => (
                      <label key={a.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border-2 border-line px-3 text-sm font-semibold has-[:checked]:border-trust has-[:checked]:bg-tint-blue">
                        <input type="checkbox" className="h-5 w-5 accent-trust" checked={areas.includes(a.id)} onChange={(e) => setAreas(e.target.checked ? (areas.length >= MAX_AREAS ? areas : [...areas, a.id]) : areas.filter((x) => x !== a.id))} />
                        {a.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}
            {areas.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">You serve {areas.length} {areas.length === 1 ? "area" : "areas"}</p>
                <div className="flex flex-wrap gap-2">
                  {areas.slice(0, 12).map((id) => (
                    <button type="button" key={id} onClick={() => setAreas(areas.filter((x) => x !== id))} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-tint-blue px-3 text-[13px] font-bold text-link" aria-label={`Remove ${areaLabel(id)}`}>
                      {areaLabel(id)} <span aria-hidden>×</span>
                    </button>
                  ))}
                  {areas.length > 12 && <span className="inline-flex min-h-9 items-center text-[13px] font-bold text-slate">and {areas.length - 12} more</span>}
                </div>
              </div>
            )}
          </fieldset>
          <Field label="About your work"><textarea value={f.bio} onChange={set("bio")} rows={3} maxLength={600} className={inputCls} placeholder="Years of experience, what you are known for" /></Field>
          <Field label="When are you available?"><input value={f.availability} onChange={set("availability")} className={inputCls} placeholder="Mon to Sat, 8am to 6pm" maxLength={120} /></Field>
          <div className="rounded-2xl bg-mist p-5">
            <p className="mb-3 text-sm font-bold">Your first service and price</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Service"><input value={f.service} onChange={set("service")} className={inputCls} placeholder="Fix a leaking tap" required maxLength={100} /></Field>
              <Field label="From (₦)"><input inputMode="numeric" value={f.min} onChange={set("min")} className={inputCls} required /></Field>
              <Field label="Up to (₦, optional)"><input inputMode="numeric" value={f.max} onChange={set("max")} className={inputCls} /></Field>
            </div>
            <p className="mt-3 text-xs text-muted">This is a typical range shown to customers. You give an exact quote for each job.</p>
          </div>
          <ErrorNote message={err} />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating..." : "Create my profile"}</Button>
        </form>
      </Card>
    </div>
  );
}

export default function Join() {
  return (
    <SignedInOnly title="Sign in to create your profile">
      <JoinForm />
    </SignedInOnly>
  );
}
