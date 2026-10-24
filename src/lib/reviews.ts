import type { Review } from "./types";

export function ratingSummary(reviews: Review[]): { count: number; average: number | null } {
  const visible = reviews.filter((r) => !r.hidden);
  if (visible.length === 0) return { count: 0, average: null };
  const sum = visible.reduce((s, r) => s + r.rating, 0);
  return { count: visible.length, average: Math.round((sum / visible.length) * 10) / 10 };
}
