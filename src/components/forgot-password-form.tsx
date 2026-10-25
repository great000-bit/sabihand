"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resetPasswordWithCode, sendResetCode } from "@/app/auth/forgot-password/actions";
import { Button, ErrorNote, Field, inputCls } from "./ui";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await sendResetCode(email);
      if (r.error) return setError(r.error);
      setStep("code");
      setNotice(`If ${email.trim()} has a Sabihand account, we have sent it a 6-digit code. It works for 15 minutes.`);
    });
  }

  function reset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const r = await resetPasswordWithCode(email, String(f.get("code") ?? ""), String(f.get("password") ?? ""));
      if (r.error) return setError(r.error);
      setStep("done");
    });
  }

  return (
    <div className="mx-auto max-w-md rounded-[2rem] border-2 border-line bg-surface p-7 sm:p-10">
      <h1 className="font-display text-3xl font-extrabold text-ink">{step === "done" ? "Password changed" : "Reset your password"}</h1>
      {step === "email" && (
        <form onSubmit={send} className="mt-6 grid gap-4">
          <p className="text-slate">Enter your email and we will send you a code to choose a new password.</p>
          <Field label="Email address">
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" disabled={pending} className="w-full">{pending ? "Sending..." : "Send code"}</Button>
        </form>
      )}
      {step === "code" && (
        <form onSubmit={reset} className="mt-6 grid gap-4">
          {notice && <p className="text-slate">{notice}</p>}
          <Field label="Code from the email">
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required className={inputCls} />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputCls} />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" disabled={pending} className="w-full">{pending ? "One moment..." : "Change password"}</Button>
          <button type="button" onClick={() => send()} disabled={pending} className="text-sm font-bold text-link">Send a new code</button>
        </form>
      )}
      {step === "done" && (
        <div className="mt-6 grid gap-4">
          <p className="text-slate">You can sign in with your new password now.</p>
          <Link href="/auth/sign-in" className="inline-flex min-h-11 items-center justify-center rounded-full bg-trust px-5 py-2.5 text-[15px] font-bold text-white">Sign in</Link>
        </div>
      )}
      {step !== "done" && (
        <p className="mt-6 text-center text-sm text-slate">
          Remembered it? <Link href="/auth/sign-in" className="font-bold text-link">Sign in</Link>
        </p>
      )}
    </div>
  );
}
