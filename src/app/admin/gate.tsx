"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Logo } from "@/components/chrome";
import { adminSignIn, adminSignOut, changeAdminPassword } from "@/server/admin-auth/actions";
import { MIN_PASSWORD, passwordProblem } from "@/lib/password-policy";

const field = "w-full min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[16px] text-ink placeholder:text-muted outline-none transition focus:border-gold/70 focus:bg-white/[0.06]";

function Frame({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#060607] text-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(227,169,43,0.14),transparent_70%)]" />
      <div className="relative mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-12">
        <Link href="/" aria-label="Sabihand home" className="mx-auto"><Logo width={150} /></Link>
        <div className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /></svg>
            Admin area
          </p>
          <h1 className="mt-3 text-2xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-slate">{sub}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-muted">Every sign-in is recorded. Repeated wrong attempts pause sign-in.</p>
      </div>
    </div>
  );
}

function Problem({ text }: { text: string | null }) {
  if (!text) return null;
  return <p role="alert" className="rounded-xl border border-alert/30 bg-alert-soft px-3 py-2 text-sm font-semibold text-alert">{text}</p>;
}

/** Email + password (+ authenticator code when switched on). Google sign-in never opens the admin area. */
export function AdminSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await adminSignIn({ email, password, code: needCode ? code : undefined });
    if (r.ok) {
      // Full reload: every page and the shared data are rebuilt with admin rights.
      window.location.reload();
      return;
    }
    setBusy(false);
    if (r.needCode) setNeedCode(true);
    setError(r.error ?? null);
    if (!r.needCode) setPassword("");
  }
  return (
    <Frame title="Sign in" sub="Use your admin email and password.">
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold">
          Email
          <input className={field} type="email" autoComplete="username" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} disabled={needCode} />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Password
          <input className={field} type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} disabled={needCode} />
        </label>
        {needCode && (
          <label className="grid gap-1.5 text-sm font-semibold">
            Code from your authenticator app
            <input className={`${field} text-center font-mono text-xl tracking-[0.5em]`} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
        )}
        <Problem text={error} />
        <button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-gold font-bold text-midnight transition hover:brightness-110 disabled:opacity-60">
          {busy ? "Checking…" : needCode ? "Verify and sign in" : "Sign in"}
        </button>
      </form>
    </Frame>
  );
}

/** Shown after signing in with a first or temporary password: it must be replaced before anything else. */
export function ForcePasswordChange({ email }: { email: string }) {
  return (
    <Frame title="Choose a new password" sub="Your current password was given to you or shared, so it has to be replaced before you continue.">
      <PasswordForm email={email} onDone={() => window.location.reload()} />
      <button onClick={async () => { await adminSignOut(); window.location.reload(); }} className="mt-4 w-full text-center text-sm font-semibold text-slate hover:text-ink">Sign out</button>
    </Frame>
  );
}

export function PasswordForm({ email, onDone }: { email: string; onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hint = next ? passwordProblem(next, email) : null;
  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (next !== again) return setError("The two new passwords are not the same.");
        setBusy(true);
        const r = await changeAdminPassword({ current, next });
        setBusy(false);
        if (r.error) return setError(r.error);
        onDone();
      }}
    >
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <label className="grid gap-1.5 text-sm font-semibold">
        Current password
        <input className={field} type="password" autoComplete="current-password" required maxLength={256} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        New password
        <input className={field} type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} />
        <span className={`text-xs font-normal ${hint ? "text-gold" : next ? "text-verified" : "text-muted"}`}>{hint ?? (next ? "Strong enough." : `At least ${MIN_PASSWORD} characters. Try four unrelated words, like “otter lantern tuesday copper”.`)}</span>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        New password again
        <input className={field} type="password" autoComplete="new-password" required maxLength={128} value={again} onChange={(e) => setAgain(e.target.value)} />
      </label>
      <Problem text={error} />
      <button type="submit" disabled={busy || Boolean(hint)} className="min-h-12 rounded-xl bg-gold font-bold text-midnight transition hover:brightness-110 disabled:opacity-50">{busy ? "Saving…" : "Save new password"}</button>
    </form>
  );
}

export function NotAdmin() {
  return (
    <Frame title="No admin access" sub="This account is not on the admin team any more.">
      <button onClick={async () => { await adminSignOut(); window.location.reload(); }} className="min-h-12 w-full rounded-xl bg-gold font-bold text-midnight">Sign out</button>
    </Frame>
  );
}
