"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Card, ErrorNote, Field, inputCls } from "./ui";

type Action = (prev: { error: string } | null, form: FormData) => Promise<{ error: string } | null>;

export function AuthForm({ mode, action }: { mode: "sign-in" | "sign-up"; action: Action }) {
  const [state, run, pending] = useActionState(action, null);
  const up = mode === "sign-up";
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-3xl font-extrabold text-midnight">{up ? "Create your account" : "Sign in"}</h1>
        <p className="mt-2 text-slate">{up ? "Use your email. You can book artisans or offer your services." : "Welcome back."}</p>
        <form action={run} className="mt-6 grid gap-4">
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
          <Button type="submit" disabled={pending}>
            {pending ? "One moment..." : up ? "Create account" : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate">
          {up ? "Already have an account? " : "New to Sabihand? "}
          <Link href={up ? "/auth/sign-in" : "/auth/sign-up"} className="font-bold text-trust">
            {up ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </Card>
    </main>
  );
}
