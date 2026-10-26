"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { AuthSlides } from "./auth-slides";
import { ErrorNote } from "./ui";

/** Google is the only way in. Sign-in and sign-up are the same step: a new Google account becomes a new Sabihand account. */
export function AuthForm({ mode, next, as, problem, disabled }: { mode: "sign-in" | "sign-up"; next: string; as: "customer" | "artisan"; problem?: string | null; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(problem ?? null);
  const [role, setRole] = useState<"customer" | "artisan">(as);
  const up = mode === "sign-up";
  const unlock = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Never leave the button locked: if the browser has not left for Google after a while, let the person try again.
  useEffect(() => () => { if (unlock.current) clearTimeout(unlock.current); }, []);
  // Coming back with the browser's Back button restores this page from cache with the button still locked.
  useEffect(() => {
    const show = (e: PageTransitionEvent) => { if (e.persisted) setBusy(false); };
    window.addEventListener("pageshow", show);
    return () => window.removeEventListener("pageshow", show);
  }, []);
  // The return trip lands on /continue, outside /auth, which finishes the session and sends each person to the right page.
  const asked = next.startsWith("/auth") ? "" : next;
  const landing = `/continue?as=${up ? role : as}${asked ? `&next=${encodeURIComponent(asked)}` : ""}`;

  async function go() {
    setBusy(true);
    setError(null);
    unlock.current = setTimeout(() => {
      setBusy(false);
      setError("Google is taking too long to open. Please try again.");
    }, 15000);
    try {
      const r = await authClient.signIn.social({
        provider: "google",
        callbackURL: landing,
        errorCallbackURL: `/auth/sign-in?error=google${asked ? `&next=${encodeURIComponent(asked)}` : ""}`,
      });
      if (r?.error) throw new Error(r.error.message);
      // On success the browser is already on its way to Google; keep the button locked until it leaves.
    } catch {
      if (unlock.current) clearTimeout(unlock.current);
      setError("We could not start Google sign-in. Check your connection and try again.");
      setBusy(false);
    }
  }

  const other = `${up ? "/auth/sign-in" : "/auth/sign-up"}${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border-2 border-line bg-surface md:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col justify-center p-7 sm:p-10">
        <h1 className="font-display text-3xl font-extrabold text-ink">{up ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-slate">{up ? "One account to book artisans or to offer your services." : "Sign in to see your requests and jobs."}</p>
        <div className="mt-8 grid gap-4">
          {up && (
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-ink">I am joining as</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {([["customer", "Someone who needs an artisan"], ["artisan", "An artisan offering my services"]] as const).map(([id, label]) => (
                  <label key={id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-line px-4 text-sm font-bold has-[:checked]:border-gold has-[:checked]:bg-white/5">
                    <input type="radio" name="role" className="h-4 w-4 accent-[#E3A92B]" checked={role === id} onChange={() => setRole(id)} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <button
            type="button"
            onClick={go}
            disabled={busy || disabled}
            className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full border-2 border-line bg-white px-6 text-base font-bold text-[#1f1f1f] transition hover:brightness-95 disabled:opacity-60"
          >
            <svg aria-hidden width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
              <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            {busy ? "Opening Google..." : up ? "Sign up with Google" : "Continue with Google"}
          </button>
          <ErrorNote message={error} />
          {up && (
            <p className="text-center text-xs text-muted">
              By creating an account you agree to our <Link href="/terms" className="font-bold text-link">Terms</Link> and <Link href="/privacy" className="font-bold text-link">Privacy policy</Link>.
            </p>
          )}
        </div>
        <p className="mt-8 text-center text-sm text-slate">
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
