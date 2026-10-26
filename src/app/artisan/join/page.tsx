"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { registerArtisan } from "@/server/actions";
import { LAUNCH_AREAS, LAUNCH_NAME, MAX_AREAS, TRADES, areaLabel } from "@/lib/catalog";
import { LocateButton } from "@/components/location-picker";
import { SignedInOnly } from "@/components/gate";
import type { Trade } from "@/lib/types";
import { Button, Card, ErrorNote, Field, LinkButton, PageHeader, inputCls } from "@/components/ui";

const STEPS = ["About you", "Where you work", "Your work", "Your first price"] as const;

/** The artisan sign-up as a short guided dialog, one small step at a time. */
function JoinForm() {
  const { viewer, me, act, busy } = useStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: viewer?.name ?? "", businessName: "", phone: "", trade: "plumbing" as Trade, bio: "", availability: "", service: "", min: "", max: "" });
  const [areas, setAreas] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  // Move focus to the step title so screen readers and keyboards follow along.
  useEffect(() => {
    head.current?.focus();
  }, [step]);

  if (me) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-3xl font-extrabold">You already have a profile</h1>
        <p className="mt-2 text-slate">{me.businessName} is live. Manage your requests from your jobs page.</p>
        <div className="mt-6 flex justify-center"><LinkButton href="/artisan">Go to my jobs</LinkButton></div>
      </Card>
    );
  }

  const last = step === STEPS.length - 1;

  /** What is missing on the current step, in plain words, or null when it is fine to go on. */
  function problem(): string | null {
    if (step === 0) {
      if (!f.name.trim()) return "Please enter your name.";
      if (!f.businessName.trim()) return "Please enter your business name.";
      if (!f.phone.trim()) return "Please enter your phone number.";
    }
    if (step === 1 && areas.length === 0) return "Pick at least one area where you work.";
    if (step === 3) {
      if (!f.service.trim()) return "Please say what service you offer.";
      if (!(Number(f.min) > 0)) return "Please enter the price you start from.";
    }
    return null;
  }

  async function next(e: React.FormEvent) {
    e.preventDefault();
    const p = problem();
    if (p) return setErr(p);
    setErr(null);
    if (!last) return setStep(step + 1);
    const error = await act(() => registerArtisan({ ...f, areaIds: areas, minNaira: Number(f.min), maxNaira: f.max ? Number(f.max) : null }));
    if (error) return setErr(error);
    router.push("/artisan");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-center">
      <PageHeader title="Join Sabihand as an artisan">Create your profile in a few minutes. It is free; Sabihand takes a commission only when a job is completed. Verification comes next.</PageHeader>
      <div role="dialog" aria-modal="true" aria-labelledby="join-step" className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
        <form onSubmit={next} className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] border-2 border-line bg-solid text-left sm:rounded-[2rem]">
          <div className="border-b border-line px-6 pb-4 pt-5 sm:px-8">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-muted">
              <span>Step {step + 1} of {STEPS.length}</span>
              <Link href="/" className="rounded-full px-2 py-1 hover:text-ink">Not now</Link>
            </div>
            <div className="mt-3 flex gap-1.5" aria-hidden>
              {STEPS.map((t, i) => <span key={t} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-gold" : "bg-white/15"}`} />)}
            </div>
            <h2 id="join-step" ref={head} tabIndex={-1} className="mt-4 font-display text-2xl font-extrabold outline-none">{STEPS[step]}</h2>
          </div>
          <div className="space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
            {step === 0 && (
              <>
                <Field label="Your name"><input value={f.name} onChange={set("name")} className={inputCls} maxLength={80} autoComplete="name" /></Field>
                <Field label="Business name"><input value={f.businessName} onChange={set("businessName")} className={inputCls} maxLength={80} placeholder="e.g. Bello Electricals" /></Field>
                <Field label="Your trade">
                  <select value={f.trade} onChange={set("trade")} className={inputCls}>
                    {TRADES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Phone number" hint="Customers see it only after they pay you.">
                  <input type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} className={inputCls} placeholder="0803 123 4567" />
                </Field>
              </>
            )}
            {step === 1 && (
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
            )}
            {step === 2 && (
              <>
                <Field label="About your work" hint="Optional. Years of experience and what you are known for."><textarea value={f.bio} onChange={set("bio")} rows={4} maxLength={600} className={inputCls} /></Field>
                <Field label="When are you available?" hint="Optional."><input value={f.availability} onChange={set("availability")} className={inputCls} placeholder="Mon to Sat, 8am to 6pm" maxLength={120} /></Field>
              </>
            )}
            {step === 3 && (
              <div className="rounded-2xl bg-mist p-5">
                <p className="mb-3 text-sm font-bold">Your first service and price</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Service"><input value={f.service} onChange={set("service")} className={inputCls} placeholder="Fix a leaking tap" maxLength={100} /></Field>
                  <Field label="From (₦)"><input inputMode="numeric" value={f.min} onChange={set("min")} className={inputCls} /></Field>
                  <Field label="Up to (₦, optional)"><input inputMode="numeric" value={f.max} onChange={set("max")} className={inputCls} /></Field>
                </div>
                <p className="mt-3 text-xs text-muted">This is a typical range shown to customers. You give an exact quote for each job.</p>
              </div>
            )}
            <ErrorNote message={err} />
          </div>
          <div className="flex gap-3 border-t border-line px-6 py-4 sm:px-8">
            {step > 0 && <Button type="button" variant="ghost" onClick={() => { setErr(null); setStep(step - 1); }}>Back</Button>}
            <Button type="submit" className="flex-1" disabled={busy}>{last ? (busy ? "Creating..." : "Create my profile") : "Continue"}</Button>
          </div>
        </form>
      </div>
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
