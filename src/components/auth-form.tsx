"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { Button, ErrorNote, Field, inputCls } from "./ui";

type Action = (prev: { error: string } | null, form: FormData) => Promise<{ error: string } | null>;

export function AuthForm({ mode, action, next }: { mode: "sign-in" | "sign-up"; action: Action; next: string }) {
  const [state, run, pending] = useActionState(action, null);
  const up = mode === "sign-up";
  const other = `${up ? "/auth/sign-in" : "/auth/sign-up"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border-2 border-line bg-surface md:grid-cols-[1fr_1.05fr]">
      <div className="grid-tex relative hidden flex-col justify-end overflow-hidden bg-midnight p-10 text-white md:flex">
        <Image src="/brand/hand-gold.svg" alt="" width={371} height={485} unoptimized aria-hidden className="pointer-events-none absolute -right-8 -top-6 h-[85%] w-auto opacity-[0.16]" />
        <p className="relative font-display text-3xl font-extrabold leading-tight">
          Trusted hands, <span className="text-gold">near you.</span>
        </p>
        <ul className="relative mt-6 space-y-3 text-[#c9d4ee]">
          <li>✓ See the price range before you book</li>
          <li>✓ Verified artisans, with the checks listed</li>
          <li>✓ Your payment is held until the job is done</li>
        </ul>
      </div>
      <div className="p-7 sm:p-10">
        <h1 className="font-display text-3xl font-extrabold text-ink">{up ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-slate">{up ? "One account to book artisans or to offer your services." : "Sign in to see your requests and jobs."}</p>
        <form action={run} className="mt-7 grid gap-4">
          <input type="hidden" name="next" value={next} />
          {up && (
            <Field label="Your name">
              <input name="name" autoComplete="name" required className={inputCls} />
            </Field>
          )}
          <Field label="Email address">
            <input name="email" type="email" autoComplete="email" required className={inputCls} />
          </Field>
          <Field label="Password" hint={up ? "At least 8 characters." : undefined}>
            <input name="password" type="password" autoComplete={up ? "new-password" : "current-password"} minLength={up ? 8 : undefined} required className={inputCls} />
          </Field>
          <ErrorNote message={state?.error ?? null} />
          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "One moment..." : up ? "Create account" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate">
          {up ? "Already have an account? " : "New to Sabihand? "}
          <Link href={other} className="font-bold text-link">
            {up ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
