"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { sendVerifyCode, verifyEmailCode } from "@/app/auth/verify/actions";
import { authClient } from "@/lib/auth/client";
import { Button, ErrorNote } from "./ui";

const DIGITS = 6;

/**
 * Six boxes for the emailed code. One real input sits on top of the boxes, so typing, pasting and the phone's
 * "from Messages/Mail" autofill all work; the boxes only draw what is in it. The code is checked as soon as all six
 * digits are in. On success a short check-mark animation plays, then the person goes on.
 */
export function VerifyEmailForm({ email, onward }: { email: string; onward: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [done, setDone] = useState(false);
  const [misses, setMisses] = useState(0);
  const [checking, startCheck] = useTransition();
  const [sending, startSend] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const tried = useRef("");
  const asked = useRef(false);

  // Count down to when "Send a new code" works again.
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = useCallback((force: boolean) => {
    setError(null);
    startSend(async () => {
      const r = await sendVerifyCode(force);
      if (!r.ok) return setError(r.error);
      setWait(r.wait);
      if (r.sent) setNotice(`We sent a 6-digit code to ${email}. Check your inbox and spam folder.`);
      else if (!force) setNotice(`Enter the 6-digit code we sent to ${email}.`);
      else setNotice(`Please wait ${r.wait}s before asking for another code.`);
      if (force && r.sent) {
        setCode("");
        tried.current = "";
        input.current?.focus();
      }
    });
  }, [email]);

  // The first code goes out when the page opens (the server keeps a code that still works instead of sending another).
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    send(false);
  }, [send]);

  // Check as soon as six digits are in, once per code typed.
  useEffect(() => {
    if (code.length !== DIGITS || tried.current === code || done) return;
    tried.current = code;
    setError(null);
    startCheck(async () => {
      const r = await verifyEmailCode(code);
      if (r.ok) {
        setDone(true);
        setTimeout(() => window.location.replace(onward), 2600);
        return;
      }
      setError(r.error);
      setMisses((m) => m + 1);
      setCode("");
      tried.current = "";
      input.current?.focus();
    });
  }, [code, done, onward]);

  if (done) {
    return (
      <div className="mx-auto grid max-w-md place-items-center rounded-[2rem] border-2 border-line bg-surface px-7 py-14 text-center sm:px-10" role="status" aria-live="polite">
        <div className="verified-badge" aria-hidden>
          <span className="verified-ring" />
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="verified-ray" style={{ ["--r" as string]: `${i * 45}deg` }} />
          ))}
          <svg viewBox="0 0 96 96" width="96" height="96" className="relative">
            <circle cx="48" cy="48" r="44" className="verified-circle" />
            <path d="M29 49.5 L42.5 63 L68 35" className="verified-tick" />
          </svg>
        </div>
        <h1 className="verified-text mt-7 font-display text-3xl font-extrabold text-ink">You’re verified</h1>
        <p className="verified-text verified-text-2 mt-2 text-slate">Welcome to Sabihand. Taking you in…</p>
        <a href={onward} className="verified-text verified-text-3 mt-7 inline-flex min-h-11 items-center rounded-full bg-gold px-6 font-bold text-midnight">
          Continue
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-[2rem] border-2 border-line bg-surface p-7 sm:p-10">
      <h1 className="font-display text-3xl font-extrabold text-ink">Confirm your email</h1>
      <p className="mt-2 text-slate">{notice ?? (sending ? "Sending your code…" : `Enter the 6-digit code we sent to ${email}.`)}</p>
      <div className="relative mt-7">
        <input
          ref={input}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, DIGITS))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={DIGITS}
          disabled={checking}
          aria-label="6-digit code"
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div key={misses} className={`grid grid-cols-6 gap-2 ${misses ? "verify-shake" : ""}`} aria-hidden>
          {Array.from({ length: DIGITS }, (_, i) => {
            const active = i === Math.min(code.length, DIGITS - 1) && !checking;
            return (
              <div
                key={i}
                className={`flex aspect-[4/5] items-center justify-center rounded-2xl border-2 font-display text-2xl font-extrabold text-ink transition sm:text-3xl ${active ? "border-gold" : code[i] ? "border-ink/40" : "border-line"}`}
              >
                {code[i] ?? ""}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 min-h-6 text-sm text-slate" aria-live="polite">{checking ? "Checking…" : null}</div>
      <ErrorNote message={error} />
      <Button type="button" variant="ghost" onClick={() => send(true)} disabled={sending || wait > 0} className="mt-4 w-full">
        {sending ? "Sending…" : wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
      </Button>
      <p className="mt-6 text-center text-sm text-slate">
        Wrong email?{" "}
        <button
          type="button"
          className="font-bold text-link"
          onClick={async () => {
            await authClient.signOut().catch(() => null);
            window.location.replace("/auth/sign-up");
          }}
        >
          Sign out and start again
        </button>
      </p>
    </div>
  );
}
