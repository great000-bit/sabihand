"use server";

import { cleanRules, planAutopilot, type AutopilotRules, type Waiting } from "@/lib/autopilot";
import { getViewer } from "./session";
import { loadAll } from "./repo";
import { paystackEnabled } from "./paystack";
import { log, readLog, readRules, runAutopilot, saveRules, type LogRow } from "./autopilot";

export interface AutopilotView {
  error: string | null;
  rules: AutopilotRules;
  log: LogRow[];
  /** What the bot would do on its next run, and what it leaves for a person and why. */
  next: { payouts: number; verifications: number; waiting: Waiting[] };
  paystack: boolean;
  canEdit: boolean;
}

export async function getAutopilot(): Promise<AutopilotView> {
  const v = await getViewer();
  const empty: AutopilotView = { error: "Only admins can see this.", rules: cleanRules(null), log: [], next: { payouts: 0, verifications: 0, waiting: [] }, paystack: false, canEdit: false };
  if (!v?.isAdmin) return empty;
  try {
    const [rules, rows, { state }] = await Promise.all([readRules(), readLog(), loadAll()]);
    // Show the plan as if the bot were fully on, so the team sees what switching it on would do.
    const preview = planAutopilot(state, { ...rules, enabled: true, payouts: { ...rules.payouts, on: true }, verification: { ...rules.verification, on: true } }, new Date().toISOString());
    return {
      error: null,
      rules,
      log: rows,
      next: { payouts: preview.actions.filter((a) => a.kind === "payout").length, verifications: preview.actions.filter((a) => a.kind === "verify").length, waiting: preview.waiting },
      paystack: paystackEnabled(),
      canEdit: Boolean(v.isSuperAdmin),
    };
  } catch (e) {
    console.error("autopilot view failed", e);
    return { ...empty, error: "Could not load Autopilot. Try again in a moment." };
  }
}

/** Only a super admin can change what the bot is allowed to do. Every change is written to the bot's log. */
export async function setAutopilot(input: unknown): Promise<{ error: string | null }> {
  const v = await getViewer();
  if (!v?.isSuperAdmin) return { error: "Only a super admin can change Autopilot." };
  const rules = cleanRules(input);
  try {
    await saveRules(rules, v.id);
    const p = rules.payouts;
    const q = rules.verification;
    await log(
      "settings",
      null,
      "info",
      `${v.name} set Autopilot ${rules.enabled ? "ON" : "OFF"}. Payouts ${p.on ? `on (${p.noLimit ? "any amount" : `up to ₦${p.maxNaira.toLocaleString("en-NG")}`}, after ${p.waitHours} h)` : "off"}. Verification ${q.on ? `on (bank name match${q.requirePhoto ? ", photo" : ""}${q.minWorkPhotos ? `, ${q.minWorkPhotos}+ work photos` : ""}${q.requireBio ? ", about text" : ""})` : "off"}. Chat watch ${rules.chatWatch.on ? "on" : "off"}.`,
    );
    if (rules.enabled) await runAutopilot("settings changed");
    return { error: null };
  } catch (e) {
    console.error("autopilot save failed", e);
    return { error: "Could not save. Try again." };
  }
}

export async function runAutopilotNow(): Promise<{ error: string | null; message?: string }> {
  const v = await getViewer();
  if (!v?.isAdmin) return { error: "Only admins can do that." };
  const r = await runAutopilot(`run by ${v.name}`);
  if (r.skipped === "switched off") return { error: "Autopilot is switched off." };
  if (r.skipped) return { error: `Not run: ${r.skipped}.` };
  return { error: null, message: r.done ? `Done ${r.done} ${r.done === 1 ? "task" : "tasks"}.` : "Nothing to do right now." };
}
