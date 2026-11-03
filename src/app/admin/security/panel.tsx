"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { confirmTotp, disableTotp, securityView, signOutOtherSessions, startTotpSetup, type SecurityView } from "@/server/admin-auth/actions";
import { Box, BoxHead, ago } from "../parts";
import { PasswordForm } from "../gate";

const LABELS: Record<string, string> = {
  sign_in: "Signed in",
  sign_in_failed: "Wrong password or code",
  sign_in_blocked: "Blocked while paused",
  sign_out: "Signed out",
  password_changed: "Password changed",
  password_change_failed: "Wrong current password",
  totp_enabled: "Two-step sign-in on",
  totp_disabled: "Two-step sign-in off",
  totp_disable_failed: "Failed to turn off two-step",
  signed_out_other_sessions: "Signed out other devices",
  temporary_password_issued: "Gave a one-time password",
  admin_added: "Added an admin",
  admin_removed: "Removed an admin",
  dispute_resolved: "Resolved a dispute",
  review_moderated: "Moderated a review",
  report_closed: "Closed a report",
  payout_marked: "Marked a payout paid",
  verification_decided: "Decided a verification",
};

const device = (ua: string) => {
  const os = /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${br} on ${os}`;
};

const btn = "inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold transition disabled:opacity-50";
const field = "w-full min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[16px] outline-none focus:border-gold/70";

export function SecurityPanel() {
  const [v, setV] = useState<SecurityView | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => securityView().then(setV), []);
  useEffect(() => {
    void load();
  }, [load]);
  if (!v) return <p className="text-slate">Loading…</p>;
  if (v.error) return <p className="text-alert">{v.error}</p>;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Box>
        <BoxHead title="Password" />
        <div className="p-5">
          <p className="mb-4 text-sm text-slate">Last changed {v.passwordChangedAt ? ago(v.passwordChangedAt) : "—"}. Changing it signs out every other device.</p>
          <PasswordForm email={v.email ?? ""} onDone={() => { setMsg("Password changed."); void load(); }} />
          {msg && <p role="status" className="mt-3 text-sm font-semibold text-verified">{msg}</p>}
        </div>
      </Box>

      <Box>
        <BoxHead title="Two-step sign-in" />
        <div className="grid gap-4 p-5 text-sm">
          <p className="text-slate">
            {v.totp
              ? "On. Signing in asks for a 6-digit code from your authenticator app as well as your password."
              : "Off. Turn it on so that a stolen password alone cannot open the admin area. Works with Google Authenticator, Microsoft Authenticator, 1Password or Authy."}
          </p>
          {!v.totp && !setup && (
            <button
              className={`${btn} bg-gold text-midnight`}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                const r = await startTotpSetup();
                setBusy(false);
                if (r.error || !r.uri || !r.secret) return setErr(r.error ?? "Could not start.");
                setSetup({ secret: r.secret, qr: await QRCode.toDataURL(r.uri, { margin: 1, width: 220, color: { dark: "#000000", light: "#ffffff" } }) });
              }}
            >
              Turn on two-step sign-in
            </button>
          )}
          {setup && (
            <div className="grid gap-3">
              <p>1. Scan this with your authenticator app.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qr} alt="QR code for your authenticator app" width={220} height={220} className="rounded-xl" />
              <p className="text-slate">Or type this key: <span className="select-all break-all font-mono text-ink">{setup.secret}</span></p>
              <p>2. Enter the 6-digit code it shows.</p>
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  const r = await confirmTotp(code);
                  setBusy(false);
                  if (r.error) return setErr(r.error);
                  setSetup(null);
                  setCode("");
                  setErr(null);
                  void load();
                }}
              >
                <input className={`${field} font-mono tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} aria-label="6-digit code" />
                <button className={`${btn} bg-gold text-midnight`} disabled={busy}>Confirm</button>
              </form>
            </div>
          )}
          {v.totp && (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!window.confirm("Turn off two-step sign-in? Your password alone will open the admin area.")) return;
                setBusy(true);
                const r = await disableTotp(pw);
                setBusy(false);
                setPw("");
                if (r.error) return setErr(r.error);
                void load();
              }}
            >
              <input className={`${field} flex-1`} type="password" autoComplete="current-password" placeholder="Your password, to turn it off" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button className={`${btn} border border-alert/40 text-alert`} disabled={busy || !pw}>Turn off</button>
            </form>
          )}
          {err && <p role="alert" className="font-semibold text-alert">{err}</p>}
        </div>
      </Box>

      <Box>
        <BoxHead title="Signed-in devices">
          <button
            className={`${btn} border border-white/10 text-slate hover:text-ink`}
            onClick={async () => {
              await signOutOtherSessions();
              void load();
            }}
          >
            Sign out other devices
          </button>
        </BoxHead>
        <ul className="divide-y divide-white/[0.06]">
          {v.sessions?.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span>
                <span className="font-semibold">{device(s.device)}</span> {s.current && <span className="ml-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">This device</span>}
                <span className="block text-xs text-muted">{s.ip} · signed in {ago(s.createdAt)}</span>
              </span>
              <span className="text-xs text-slate">active {ago(s.lastSeenAt)}</span>
            </li>
          ))}
        </ul>
      </Box>

      <Box>
        <BoxHead title="Activity log" />
        <ul className="max-h-[420px] divide-y divide-white/[0.06] overflow-y-auto">
          {v.log?.length ? (
            v.log.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className={`font-semibold ${/failed|blocked/.test(l.action) ? "text-alert" : ""}`}>{LABELS[l.action] ?? l.action}</span>
                  <span className="block truncate text-xs text-muted">{l.email ?? "unknown"} · {l.ip ?? ""}</span>
                </span>
                <span className="flex-none text-xs text-slate">{ago(l.at)}</span>
              </li>
            ))
          ) : (
            <li className="px-5 py-4 text-slate">Nothing yet.</li>
          )}
        </ul>
      </Box>
    </div>
  );
}
