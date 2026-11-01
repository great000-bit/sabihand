import { artisanPayoutKobo } from "./money";
import type { AppState, Artisan, Payment } from "./types";

/**
 * Autopilot: the admin bot. It only ever does two jobs, and only when the team switched each one on:
 *  - pay artisans their share of released payments,
 *  - approve artisans who asked for verification and pass the automatic checks.
 * It never rejects anyone, never touches disputes or reports, and never pays to a bank account the bank has not
 * confirmed. Everything it decides comes from planAutopilot below, a pure function of the data and the team's rules.
 */
export interface AutopilotRules {
  /** The master switch. Off means the bot does nothing at all. */
  enabled: boolean;
  payouts: {
    on: boolean;
    /** Largest single payout the bot may send, in naira. Bigger ones wait for a person. */
    maxNaira: number;
    /** Hours to wait after a job is released before paying, so a late problem can still stop it. */
    waitHours: number;
  };
  verification: {
    on: boolean;
    requirePhoto: boolean;
    /** Work photos needed on the profile. */
    minWorkPhotos: number;
    /** An "about" text of at least 30 characters. */
    requireBio: boolean;
  };
}

export const DEFAULT_RULES: AutopilotRules = {
  enabled: false,
  payouts: { on: false, maxNaira: 50000, waitHours: 24 },
  verification: { on: false, requirePhoto: true, minWorkPhotos: 1, requireBio: true },
};

const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** Accepts anything (stored JSON, a form) and returns safe rules: unknown or bad values fall back to the defaults. */
export function cleanRules(input: unknown): AutopilotRules {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, Record<string, unknown> | unknown>;
  const p = (i.payouts && typeof i.payouts === "object" ? i.payouts : {}) as Record<string, unknown>;
  const v = (i.verification && typeof i.verification === "object" ? i.verification : {}) as Record<string, unknown>;
  const d = DEFAULT_RULES;
  return {
    enabled: bool(i.enabled, d.enabled),
    payouts: { on: bool(p.on, d.payouts.on), maxNaira: num(p.maxNaira, 0, 5_000_000, d.payouts.maxNaira), waitHours: num(p.waitHours, 0, 720, d.payouts.waitHours) },
    verification: {
      on: bool(v.on, d.verification.on),
      requirePhoto: bool(v.requirePhoto, d.verification.requirePhoto),
      minWorkPhotos: num(v.minWorkPhotos, 0, 8, d.verification.minWorkPhotos),
      requireBio: bool(v.requireBio, d.verification.requireBio),
    },
  };
}

const words = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);

/** True when the bank's account name holds the artisan's names: at least two of them, or the only one they gave. */
export function namesMatch(profileName: string, bankName: string): boolean {
  const mine = [...new Set(words(profileName))];
  const bank = new Set(words(bankName));
  if (mine.length === 0) return false;
  const hits = mine.filter((w) => bank.has(w)).length;
  return hits >= Math.min(2, mine.length);
}

export interface PlannedPayout {
  kind: "payout";
  paymentId: string;
  bookingId: string;
  artisanId: string;
  amountKobo: number;
}
export interface PlannedVerification {
  kind: "verify";
  artisanId: string;
}
export interface Waiting {
  kind: "payout" | "verify";
  id: string;
  /** Why the bot is leaving this one for a person. */
  reason: string;
}

/** What is still missing before the bot may verify this artisan. Empty means every rule passes. */
export function verificationGaps(a: Artisan, r: AutopilotRules["verification"]): string[] {
  const gaps: string[] = [];
  if (!a.bank?.verified) gaps.push("bank account not confirmed by the bank");
  // Always required: it is the one check the bot can truly make, so it is what the Verified badge says was checked.
  else if (!namesMatch(a.name, a.bank.accountName)) gaps.push(`bank name "${a.bank.accountName}" does not match "${a.name}"`);
  if (r.requirePhoto && !a.photoId) gaps.push("no profile photo");
  if (a.portfolio.length < r.minWorkPhotos) gaps.push(`${a.portfolio.length} of ${r.minWorkPhotos} work photos`);
  if (r.requireBio && a.bio.trim().length < 30) gaps.push("about text too short");
  if (!a.phone) gaps.push("no phone number");
  return gaps;
}

/** Why the bot may not pay this payment yet, or null when it may. */
export function payoutBlock(state: AppState, p: Payment, r: AutopilotRules["payouts"], now: string): string | null {
  const b = state.bookings.find((x) => x.id === p.bookingId);
  const a = b && state.artisans.find((x) => x.id === b.artisanId);
  if (!b || !a) return "job or artisan missing";
  if (a.sample) return "sample profile";
  if (state.reports.some((x) => x.kind === "booking" && x.targetId === b.id && !x.resolvedAt)) return "open problem on this job";
  if (!a.bank) return "no bank account";
  if (!a.bank.verified || !a.bank.bankCode) return "bank account not confirmed by the bank";
  const amount = artisanPayoutKobo(p.amountKobo);
  if (amount > r.maxNaira * 100) return `above the ₦${r.maxNaira.toLocaleString("en-NG")} limit`;
  const ready = new Date(p.settledAt ?? p.createdAt).getTime() + r.waitHours * 3600_000;
  if (ready > new Date(now).getTime()) return `waiting until ${new Date(ready).toISOString()}`;
  return null;
}

/** Everything the bot would do right now under these rules, and what it is leaving for a person and why. */
export function planAutopilot(state: AppState, rules: AutopilotRules, now: string): { actions: (PlannedPayout | PlannedVerification)[]; waiting: Waiting[] } {
  const actions: (PlannedPayout | PlannedVerification)[] = [];
  const waiting: Waiting[] = [];
  if (!rules.enabled) return { actions, waiting };
  if (rules.payouts.on) {
    for (const p of state.payments) {
      if (p.status !== "released" || p.payout) continue;
      const why = payoutBlock(state, p, rules.payouts, now);
      if (why) {
        waiting.push({ kind: "payout", id: p.id, reason: why });
        continue;
      }
      const b = state.bookings.find((x) => x.id === p.bookingId)!;
      actions.push({ kind: "payout", paymentId: p.id, bookingId: b.id, artisanId: b.artisanId, amountKobo: artisanPayoutKobo(p.amountKobo) });
    }
  }
  if (rules.verification.on) {
    for (const a of state.artisans) {
      if (a.verification.status !== "pending" || a.sample) continue;
      const gaps = verificationGaps(a, rules.verification);
      if (gaps.length) waiting.push({ kind: "verify", id: a.id, reason: gaps.join(", ") });
      else actions.push({ kind: "verify", artisanId: a.id });
    }
  }
  return { actions, waiting };
}
