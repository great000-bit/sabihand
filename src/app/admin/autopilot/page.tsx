"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { AutopilotRules } from "@/lib/autopilot";
import { getAutopilot, runAutopilotNow, setAutopilot, type AutopilotView } from "@/server/autopilot-actions";
import { Button, ErrorNote } from "@/components/ui";
import { Box, BoxHead, Icon, Quiet, ago } from "../parts";

function Switch({ on, onChange, disabled, label, dark = false }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; dark?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 flex-none rounded-full transition disabled:opacity-50 ${on ? (dark ? "bg-midnight" : "bg-gold") : "bg-white/15"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

function Rule({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{children}</div>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

const numCls = "h-9 w-28 rounded-xl border border-white/10 bg-[#0d0e10] px-3 text-right text-sm text-ink focus:border-gold/60 focus:outline-none disabled:opacity-60";

export default function AutopilotPage() {
  const { state } = useStore();
  const router = useRouter();
  const [view, setView] = useState<AutopilotView | null>(null);
  const [draft, setDraft] = useState<AutopilotRules | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const v = await getAutopilot();
    setView(v);
    setDraft(v.rules);
    if (v.error) setErr(v.error);
  };
  useEffect(() => {
    let off = false;
    void getAutopilot().then((v) => {
      if (off) return;
      setView(v);
      setDraft(v.rules);
      if (v.error) setErr(v.error);
    });
    return () => {
      off = true;
    };
  }, []);

  if (!view || !draft) return <Quiet>Loading Autopilot…</Quiet>;
  const ro = !view.canEdit || busy;
  const changed = JSON.stringify(draft) !== JSON.stringify(view.rules);
  const set = (fn: (r: AutopilotRules) => AutopilotRules) => setDraft(fn(draft));
  const save = async (rules: AutopilotRules) => {
    setBusy(true);
    setNote(null);
    const r = await setAutopilot(rules);
    setErr(r.error);
    await load();
    router.refresh();
    setBusy(false);
  };
  const name = (kind: string, id: string | null) => {
    if (!id) return null;
    if (kind === "verify") {
      const a = state.artisans.find((x) => x.id === id);
      return a ? <Link href={`/admin/artisans/${a.id}`} className="font-semibold text-link hover:underline">{a.businessName}</Link> : null;
    }
    const p = state.payments.find((x) => x.id === id);
    return p ? <Link href={`/admin/requests/${p.bookingId}`} className="font-semibold text-link hover:underline">Open job</Link> : null;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* Master switch */}
      <div className={`relative overflow-hidden rounded-[1.25rem] p-5 lg:col-span-12 ${view.rules.enabled ? "bg-gold text-midnight" : "border border-white/[0.07] bg-[#111215]"}`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl ${view.rules.enabled ? "bg-midnight text-gold" : "bg-white/5 text-slate"}`}><Icon name="autopilot" className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">Autopilot is {view.rules.enabled ? "on" : "off"}</p>
            <p className={`text-sm ${view.rules.enabled ? "opacity-80" : "text-slate"}`}>
              {view.rules.enabled ? "The bot is watching the site and doing only the jobs switched on below." : "The bot does nothing. Every payout and verification waits for a person."}
            </p>
          </div>
          <Switch label="Autopilot on or off" dark={view.rules.enabled} on={draft.enabled} disabled={ro} onChange={(v) => save({ ...draft, enabled: v })} />
        </div>
      </div>

      {/* Instructions */}
      <Box className="lg:col-span-7">
        <BoxHead title="Instructions">{!view.canEdit && <span className="text-xs text-muted">Only a super admin can change these</span>}</BoxHead>
        <p className="px-5 pb-3 pt-1 text-sm text-slate">The bot follows these rules and nothing else. If anything is unclear or a rule does not pass, it leaves the job for you.</p>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4">
          <div>
            <p className="font-bold">Pay artisans</p>
            <p className="text-xs text-muted">Sends the artisan&apos;s share by Paystack transfer after the customer confirms the job.</p>
          </div>
          <Switch label="Payouts" on={draft.payouts.on} disabled={ro} onChange={(v) => set((r) => ({ ...r, payouts: { ...r.payouts, on: v } }))} />
        </div>
        <Rule hint="Bigger payouts wait for you.">
          <label className="flex items-center justify-between gap-3">Largest payout the bot may send (₦)
            <input type="number" min={0} step={1000} className={numCls} disabled={ro} value={draft.payouts.maxNaira} onChange={(e) => set((r) => ({ ...r, payouts: { ...r.payouts, maxNaira: Number(e.target.value) } }))} />
          </label>
        </Rule>
        <Rule hint="Gives time for a late problem to stop the payout.">
          <label className="flex items-center justify-between gap-3">Wait after the job is confirmed (hours)
            <input type="number" min={0} max={720} className={numCls} disabled={ro} value={draft.payouts.waitHours} onChange={(e) => set((r) => ({ ...r, payouts: { ...r.payouts, waitHours: Number(e.target.value) } }))} />
          </label>
        </Rule>
        <Rule hint="Always on. Never pays an account the bank has not confirmed, or a job with an open problem.">✓ Only to bank accounts confirmed by the bank</Rule>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4">
          <div>
            <p className="font-bold">Verify artisans</p>
            <p className="text-xs text-muted">Approves artisans who asked to be verified and pass every check below. It never rejects anyone.</p>
          </div>
          <Switch label="Verification" on={draft.verification.on} disabled={ro} onChange={(v) => set((r) => ({ ...r, verification: { ...r.verification, on: v } }))} />
        </div>
        <Rule hint="Always on. This is the check the Verified badge will show.">✓ The bank&apos;s account name matches the artisan&apos;s name</Rule>
        <Rule>
          <label className="flex items-center justify-between gap-3">Has a profile photo
            <Switch label="Profile photo required" on={draft.verification.requirePhoto} disabled={ro} onChange={(v) => set((r) => ({ ...r, verification: { ...r.verification, requirePhoto: v } }))} />
          </label>
        </Rule>
        <Rule>
          <label className="flex items-center justify-between gap-3">Has an about text
            <Switch label="About text required" on={draft.verification.requireBio} disabled={ro} onChange={(v) => set((r) => ({ ...r, verification: { ...r.verification, requireBio: v } }))} />
          </label>
        </Rule>
        <Rule>
          <label className="flex items-center justify-between gap-3">Work photos needed
            <input type="number" min={0} max={8} className={numCls} disabled={ro} value={draft.verification.minWorkPhotos} onChange={(e) => set((r) => ({ ...r, verification: { ...r.verification, minWorkPhotos: Number(e.target.value) } }))} />
          </label>
        </Rule>

        {view.canEdit && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-5 py-4">
            <Button variant="gold" disabled={busy || !changed} onClick={() => save(draft)}>{busy ? "Saving…" : "Save instructions"}</Button>
            {changed && <Button variant="ghost" disabled={busy} onClick={() => setDraft(view.rules)}>Undo changes</Button>}
          </div>
        )}
        <div className="px-5 pb-4"><ErrorNote message={err} /></div>
      </Box>

      <div className="grid content-start gap-4 lg:col-span-5">
        <Box className="p-5">
          <p className="font-bold">Always yours</p>
          <p className="mt-1 text-sm text-slate">The bot never touches these. They need a person.</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {["Disputes and refunds", "Reported reviews and artisans", "Rejecting a verification", "Adding or removing admins"].map((t) => (
              <li key={t} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2"><Icon name="disputes" className="h-4 w-4 text-gold" />{t}</li>
            ))}
          </ul>
        </Box>

        <Box className="p-5">
          <p className="font-bold">Next run</p>
          <p className="mt-1 text-sm text-slate">If every job were switched on, the bot would now pay <b className="text-ink">{view.next.payouts}</b> and verify <b className="text-ink">{view.next.verifications}</b>.</p>
          {view.next.waiting.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold text-muted">Left for you</p>
              <ul className="mt-1 grid gap-1.5 text-sm">
                {view.next.waiting.slice(0, 6).map((w) => (
                  <li key={w.kind + w.id} className="rounded-xl bg-white/[0.03] px-3 py-2"><span className="text-muted">{w.kind === "payout" ? "Payout" : "Verification"}:</span> {w.reason} {name(w.kind, w.id)}</li>
                ))}
              </ul>
            </>
          )}
          {!view.paystack && <p className="mt-3 text-xs text-gold">Paystack is not connected, so the bot cannot send payouts yet.</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              disabled={busy || !view.rules.enabled}
              onClick={async () => {
                setBusy(true);
                const r = await runAutopilotNow();
                setErr(r.error);
                setNote(r.message ?? null);
                await load();
                router.refresh();
                setBusy(false);
              }}
            >
              Run now
            </Button>
            {note && <span className="text-sm text-verified">{note}</span>}
          </div>
          <p className="mt-2 text-xs text-muted">The bot also runs by itself after every payment and change on the site, and once a day.</p>
        </Box>
      </div>

      <Box className="lg:col-span-12">
        <BoxHead title="What the bot did" />
        {view.log.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate">Nothing yet. Every action and every change to these instructions shows up here.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] p-2">
            {view.log.map((l) => (
              <li key={l.id} className="flex gap-3 px-3 py-2.5 text-sm">
                <span className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${l.outcome === "done" ? "bg-verified" : l.outcome === "failed" ? "bg-alert" : l.outcome === "sent" ? "bg-gold" : "bg-white/30"}`} />
                <span className="min-w-0 flex-1">
                  {l.detail} {name(l.kind, l.target)}
                  <span className="block text-xs text-muted">{ago(l.at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Box>
    </div>
  );
}
