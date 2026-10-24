export const COMMISSION_BPS = 1000; // 10.00%. Provisional: confirm before launch (PRD open decision 7).

const nf = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function formatNaira(kobo: number): string {
  return `₦${nf.format(Math.round(kobo / 100))}`;
}

/** Compact form for price ranges: ₦8k, ₦12.5k, ₦1.2M */
export function formatNairaShort(kobo: number): string {
  const n = kobo / 100;
  if (n >= 1_000_000) return `₦${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `₦${trim(n / 1_000)}k`;
  return `₦${nf.format(n)}`;
}

function trim(v: number): string {
  return (Math.round(v * 10) / 10).toString();
}

export function commissionKobo(amountKobo: number, bps: number = COMMISSION_BPS): number {
  if (!Number.isInteger(amountKobo) || amountKobo < 0) throw new Error("amount must be a non-negative integer of kobo");
  return Math.round((amountKobo * bps) / 10_000);
}

export function artisanPayoutKobo(amountKobo: number, bps: number = COMMISSION_BPS): number {
  return amountKobo - commissionKobo(amountKobo, bps);
}

export function formatPriceRange(minKobo: number, maxKobo: number | null): string {
  if (maxKobo === null) return `From ${formatNairaShort(minKobo)}, quote needed`;
  if (minKobo === maxKobo) return formatNairaShort(minKobo);
  return `${formatNairaShort(minKobo)} – ${formatNairaShort(maxKobo)}`;
}
