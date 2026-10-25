"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthSlides } from "./auth-slides";
import { Button, ErrorNote, Field, inputCls } from "./ui";

type Action = (prev: { error: string } | null, form: FormData) => Promise<{ error: string } | null>;

export function AuthForm({ mode, action, next }: { mode: "sign-in" | "sign-up"; action: Action; next: string }) {
  const [state, run, pending] = useActionState(action, null);
  const up = mode === "sign-up";
  const other = `${up ? "/auth/sign-in" : "/auth/sign-up"}${next !== "/artisans" ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border-2 border-line bg-surface md:grid-cols-[1.05fr_1fr]">
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
          {up && (
            <p className="text-center text-xs text-muted">
              By creating an account you agree to our <Link href="/terms" className="font-bold text-link">Terms</Link> and <Link href="/privacy" className="font-bold text-link">Privacy policy</Link>.
            </p>
          )}
        </form>
        <p className="mt-6 text-center text-sm text-slate">
          {up ? "Already have an account? " : "New to Sabihand? "}
          <Link href={other} className="font-bold text-link">
            {up ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
      <AuthSlides />
    </div>
  );
}
