import type { Area } from "./types";
import { AREAS } from "./catalog";

/** A box around Nigeria. Outside it, GPS cannot place someone on the map of Sabihand's areas. */
export const NIGERIA = { latMin: 4.2, latMax: 13.95, lngMin: 2.6, lngMax: 14.75 };

export function inNigeria(lat: number, lng: number): boolean {
  return lat >= NIGERIA.latMin && lat <= NIGERIA.latMax && lng >= NIGERIA.lngMin && lng <= NIGERIA.lngMax;
}

/** Great-circle distance in kilometres. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The area whose centre is closest to a point, with how far away it is. */
export function nearestArea(lat: number, lng: number, areas: Area[] = AREAS): { area: Area; km: number } | null {
  let best: { area: Area; km: number } | null = null;
  for (const area of areas) {
    const km = distanceKm(lat, lng, area.lat, area.lng);
    if (!best || km < best.km) best = { area, km };
  }
  return best;
}
