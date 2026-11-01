import { after } from "next/server";
import { AUTOPILOT_ID, decideVerification, markPaidOut, type Ctx } from "@/lib/engine";
import { cleanRules, planAutopilot, type AutopilotRules } from "@/lib/autopilot";
import { formatNaira } from "@/lib/money";
import type { Viewer } from "@/lib/types";
import { sql } from "./db";
import { ConflictError, loadAll, persist } from "./repo";
import { newId } from "./ids";
import { notifyChanges } from "./email";
import { paystackEnabled, sendTransfer } from "./paystack";

/** The bot acts with admin rights, but only through the two engine calls below. */
const BOT: Viewer = { id: AUTOPILOT_ID, name: "Sabihand Autopilot", email: "", isAdmin: true };
const ctx = (): Ctx => ({ now: new Date().toISOString(), id: newId, user: BOT });

export const payoutReference = (paymentId: string) => `sbh_payout_${paymentId}`;

export async function readRules(): Promise<AutopilotRules> {
  const rows = (await sql()`select rules from app.autopilot where id = 1`) as { rules: unknown }[];
  return cleanRules(rows[0]?.rules);
}

export async function saveRules(rules: AutopilotRules, by: string): Promise<void> {
  await sql()`insert into app.autopilot (id, rules, updated_by, updated_at) values (1, ${JSON.stringify(rules)}::jsonb, ${by}, now())
    on conflict (id) do update set rules = excluded.rules, updated_by = excluded.updated_by, updated_at = now()`;
}

export async function log(kind: string, target: string | null, outcome: string, detail: string): Promise<void> {
  try {
    await sql()`insert into app.autopilot_log (kind, target, outcome, detail) values (${kind}, ${target}, ${outcome}, ${detail.slice(0, 1000)})`;
  } catch (e) {
    console.error("autopilot log failed", e);
  }
}

export interface LogRow {
  id: string;
  at: string;
  kind: string;
  target: string | null;
  outcome: string;
  detail: string;
}

export async function readLog(limit = 60): Promise<LogRow[]> {
  const rows = (await sql()`select id::text, at, kind, target, outcome, detail from app.autopilot_log order by at desc limit ${limit}`) as (Omit<LogRow, "at"> & { at: Date | string })[];
  return rows.map((r) => ({ ...r, at: new Date(r.at).toISOString() }));
}

/** Payments the bot already tried in the last day: a failed transfer is not retried in a loop, a person looks first. */
async function recentlyTried(): Promise<Set<string>> {
  const rows = (await sql()`select distinct target from app.autopilot_log where kind = 'payout' and outcome in ('failed', 'sent') and at > now() - interval '1 day'`) as { target: string }[];
  return new Set(rows.map((r) => r.target));
}

/** Applies one engine change as the bot, retrying on a conflicting write, then sends the usual emails. */
async function apply(fn: (s: Parameters<typeof markPaidOut>[0]) => ReturnType<typeof markPaidOut>): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await loadAll();
    const next = fn(before.state);
    try {
      await persist(before, next);
      await notifyChanges(before.state, next);
      return;
    } catch (e) {
      if (e instanceof ConflictError) continue;
      throw e;
    }
  }
  throw new Error("The data kept changing. Will try again on the next run.");
}

let running = false;

/**
 * One pass of the bot. Safe to call often and from several places: it does nothing when switched off,
 * and a payment can never be paid twice because Paystack refuses a repeated transfer reference.
 */
export async function runAutopilot(reason: string): Promise<{ done: number; waiting: number; skipped?: string }> {
  if (running) return { done: 0, waiting: 0, skipped: "already running" };
  running = true;
  try {
    const rules = await readRules();
    if (!rules.enabled) return { done: 0, waiting: 0, skipped: "switched off" };
    const { state } = await loadAll();
    const plan = planAutopilot(state, rules, new Date().toISOString());
    const tried = await recentlyTried();
    let done = 0;
    for (const step of plan.actions) {
      if (step.kind === "verify") {
        const a = state.artisans.find((x) => x.id === step.artisanId);
        try {
          await apply((s) => decideVerification(s, step.artisanId, "verified", ["bank"], "", ctx()));
          await log("verify", step.artisanId, "done", `Verified ${a?.businessName ?? step.artisanId}: bank confirmed the account name matches, profile complete.`);
          done++;
        } catch (e) {
          await log("verify", step.artisanId, "failed", `Could not verify ${a?.businessName ?? step.artisanId}: ${e instanceof Error ? e.message : e}`);
        }
        continue;
      }
      if (tried.has(step.paymentId)) continue;
      const a = state.artisans.find((x) => x.id === step.artisanId)!;
      const label = `${formatNaira(step.amountKobo)} to ${a.businessName}`;
      if (!paystackEnabled()) {
        await log("payout", step.paymentId, "failed", `Ready to pay ${label}, but Paystack is not connected.`);
        continue;
      }
      try {
        const t = await sendTransfer({ accountNumber: a.bank!.accountNumber, bankCode: a.bank!.bankCode!, accountName: a.bank!.accountName, amountKobo: step.amountKobo, reference: payoutReference(step.paymentId), reason: `Sabihand payout ${step.bookingId}` });
        if (t.status === "success") {
          await apply((s) => markPaidOut(s, step.paymentId, t.reference, ctx()));
          await log("payout", step.paymentId, "done", `Paid ${label}. Paystack ref ${t.reference}.`);
          done++;
        } else if (t.status === "pending") {
          await log("payout", step.paymentId, "sent", `Sent ${label}; the bank is still processing it. It is marked paid when Paystack confirms.`);
        } else if (t.status === "otp") {
          await log("payout", step.paymentId, "failed", `Paystack asked for an OTP for ${label}. Turn off OTP for transfers in Paystack settings so the bot can pay.`);
        } else {
          await log("payout", step.paymentId, "failed", `Paystack answered "${t.status}" for ${label}. Pay it by hand from Payouts.`);
        }
      } catch (e) {
        await log("payout", step.paymentId, "failed", `Could not pay ${label}: ${e instanceof Error ? e.message : e}`);
      }
    }
    if (done > 0) console.info(`autopilot (${reason}): ${done} done, ${plan.waiting.length} left for a person`);
    return { done, waiting: plan.waiting.length };
  } catch (e) {
    console.error("autopilot run failed", e);
    await log("run", null, "failed", `Run stopped: ${e instanceof Error ? e.message : e}`);
    return { done: 0, waiting: 0, skipped: "error" };
  } finally {
    running = false;
  }
}

/** Paystack confirmed (or bounced) a transfer the bot sent earlier. */
export async function transferSettled(reference: string, ok: boolean, status: string): Promise<void> {
  const m = reference.match(/^sbh_payout_(.+)$/);
  if (!m) return;
  const paymentId = m[1];
  if (!ok) {
    await log("payout", paymentId, "failed", `Paystack reports the transfer ${status}. The money did not reach the artisan; pay it by hand.`);
    return;
  }
  try {
    const { state } = await loadAll();
    if (state.payments.find((p) => p.id === paymentId)?.payout) return;
    await apply((s) => markPaidOut(s, paymentId, reference, ctx()));
    await log("payout", paymentId, "done", `Paystack confirmed transfer ${reference}. Marked as paid.`);
  } catch (e) {
    await log("payout", paymentId, "failed", `Transfer ${reference} went through but could not be marked paid: ${e instanceof Error ? e.message : e}`);
  }
}

/** Runs the bot after the current response, so the action that woke it is never slowed down. */
export function wakeAutopilot(reason: string): void {
  const work = async () => {
    await runAutopilot(reason);
  };
  try {
    after(work);
  } catch {
    void work();
  }
}
