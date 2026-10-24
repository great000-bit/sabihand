import type { AppState, Artisan, Trade } from "./types";
import { areaById } from "./catalog";
import { ratingSummary } from "./reviews";

export type SortKey = "relevance" | "price_low" | "rating";

export interface SearchParams {
  trade?: Trade | "";
  city?: string;
  areaId?: string;
  verifiedOnly?: boolean;
  sort?: SortKey;
}

export function isPublished(a: Artisan): boolean {
  return a.verification.status !== "rejected" && a.services.length > 0;
}

export function servesArea(a: Artisan, p: Pick<SearchParams, "city" | "areaId">): boolean {
  if (p.areaId) return a.areaIds.includes(p.areaId);
  if (p.city) return a.areaIds.some((id) => areaById(id)?.city === p.city);
  return true;
}

export function searchArtisans(state: Pick<AppState, "artisans" | "reviews">, p: SearchParams): Artisan[] {
  const list = state.artisans.filter((a) => {
    if (!isPublished(a)) return false;
    if (p.trade && a.trade !== p.trade) return false;
    if (!servesArea(a, p)) return false;
    if (p.verifiedOnly && a.verification.status !== "verified") return false;
    return true;
  });
  const minPrice = (a: Artisan) => Math.min(...a.services.map((s) => s.minKobo));
  const rating = (a: Artisan) => ratingSummary(state.reviews.filter((r) => r.artisanId === a.id)).average ?? 0;
  const verifiedRank = (a: Artisan) => (a.verification.status === "verified" ? 0 : 1);
  const sort = p.sort ?? "relevance";
  return [...list].sort((x, y) => {
    if (sort === "price_low") return minPrice(x) - minPrice(y);
    if (sort === "rating") return rating(y) - rating(x) || verifiedRank(x) - verifiedRank(y);
    return verifiedRank(x) - verifiedRank(y) || x.businessName.localeCompare(y.businessName);
  });
}
