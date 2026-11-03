"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import * as actions from "@/server/actions";
import { Button, Card, ErrorNote, Field, inputCls } from "@/components/ui";
import { BANKS } from "@/lib/catalog";
import type { Artisan } from "@/lib/types";

/** Where the artisan's earnings are paid. The bank confirms the account name when live lookup is on. */
export function PayoutAccount({ me }: { me: Artisan }) {
  const { act, busy, config } = useStore();
  const [open, setOpen] = useState(!me.bank);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [f, setF] = useState({ bankName: me.bank?.bankName ?? "", bankCode: me.bank?.bankCode ?? "", accountNumber: me.bank?.accountNumber ?? "", accountName: me.bank?.accountName ?? "" });
  // The name the bank returned for the number and bank now in the form. "" until a lookup succeeds.
  const [found, setFound] = useState<{ name: string; for: string } | null>(null);
  const [looking, setLooking] = useState(false);
  const [lookErr, setLookErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const live = config.paymentsEnabled && banks.length > 0;
  const key = `${f.bankCode}:${f.accountNumber}`;

  useEffect(() => {
    if (!open || !config.paymentsEnabled || banks.length) return;
    let off = false;
    void actions.listBanks().then((r) => !off && setBanks(r.banks));
    return () => {
      off = true;
    };
  }, [open, config.paymentsEnabled, banks.length]);

  const lookup = async (code: string, num: string) => {
    setFound(null);
    setLookErr(null);
    if (!code || !/^\d{10}$/.test(num)) return;
    setLooking(true);
    const r = await actions.lookupAccount(code, num);
    setLooking(false);
    if (r.error || !r.name) setLookErr(r.error ?? "We could not check that account.");
    else setFound({ name: r.name, for: `${code}:${num}` });
  };

  const pickBank = (code: string) => {
    const bank = banks.find((x) => x.code === code);
    setF((p) => ({ ...p, bankCode: code, bankName: bank?.name ?? "" }));
    void lookup(code, f.accountNumber);
  };
  const setNumber = (v: string) => {
    const num = v.replace(/\D/g, "").slice(0, 10);
    setF((p) => ({ ...p, accountNumber: num }));
    if (live) void lookup(f.bankCode, num);
  };
  const confirmed = live && found?.for === key ? found.name : null;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Payout account</h2>
          <p className="text-slate">{me.bank ? `${me.bank.bankName} · ${me.bank.accountName} · ••••${me.bank.accountNumber.slice(-4)}` : "Add the bank account where your earnings are paid."}</p>
          {me.bank && <p className={`text-sm font-semibold ${me.bank.verified ? "text-verified" : "text-gold-ink"}`}>{me.bank.verified ? "✓ Name confirmed by your bank" : "Name not yet checked by the bank"}</p>}
        </div>
        {me.bank && !open && <Button variant="ghost" onClick={() => setOpen(true)}>Change</Button>}
      </div>
      {open && (
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const error = await act(() => actions.saveBankDetails(me.id, { ...f, accountName: confirmed ?? f.accountName }));
            setErr(error);
            if (!error) setOpen(false);
          }}
        >
          <Field label="Bank">
            {live ? (
              <select value={f.bankCode} onChange={(e) => pickBank(e.target.value)} className={inputCls} required>
                <option value="" disabled>Choose your bank</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            ) : (
              <>
                <input list="banks" value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} className={inputCls} required maxLength={60} />
                <datalist id="banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
              </>
            )}
          </Field>
          <Field label="Account number"><input inputMode="numeric" value={f.accountNumber} onChange={(e) => setNumber(e.target.value)} className={inputCls} required maxLength={10} placeholder="10 digits" /></Field>
          <div className="sm:col-span-2">
            {live ? (
              <div aria-live="polite" className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 ${confirmed ? "border-verified/60 bg-verified/10" : "border-line"}`}>
                {looking ? (
                  <span className="text-slate">Checking with your bank…</span>
                ) : confirmed ? (
                  <>
                    <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-verified text-sm font-extrabold text-white">✓</span>
                    <span><span className="block text-xs font-bold uppercase tracking-wide text-muted">Account name from your bank</span><span className="block text-lg font-extrabold">{confirmed}</span></span>
                  </>
                ) : lookErr ? (
                  <span className="font-semibold text-alert">{lookErr}</span>
                ) : (
                  <span className="text-slate">Choose your bank and enter the 10-digit number. Your account name appears here.</span>
                )}
              </div>
            ) : (
              <Field label="Account name">
                <input value={f.accountName} onChange={(e) => setF({ ...f, accountName: e.target.value })} className={inputCls} required maxLength={80} />
                <span className="mt-1 block text-sm text-muted">Automatic name lookup is not switched on yet. The Sabihand team checks this name before paying you.</span>
              </Field>
            )}
          </div>
          <div className="space-y-3 sm:col-span-2">
            <ErrorNote message={err} />
            <Button type="submit" disabled={busy || looking || (live && !confirmed)}>Save account</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
