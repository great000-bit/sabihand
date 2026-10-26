import type { Area, Trade } from "./types";
import locations from "@/data/locations.json";

export const TRADES: { id: Trade; label: string; plural: string; blurb: string }[] = [
  { id: "plumbing", label: "Plumber", plural: "Plumbers", blurb: "Taps, pipes, tanks, water heaters" },
  { id: "electrical", label: "Electrician", plural: "Electricians", blurb: "Wiring, sockets, fans, inverters" },
  { id: "tailoring", label: "Tailor", plural: "Tailors", blurb: "Alterations, native wear, uniforms" },
  { id: "carpentry", label: "Carpenter", plural: "Carpenters", blurb: "Doors, wardrobes, repairs, furniture" },
  { id: "mechanic", label: "Mechanic", plural: "Mechanics", blurb: "Car servicing, brakes, engine and AC repair" },
  { id: "hairdressing", label: "Hair stylist", plural: "Hair stylists", blurb: "Braids, cuts, styling, home service" },
  { id: "painting", label: "Painter", plural: "Painters", blurb: "Interior, exterior, POP and finishing" },
  { id: "welding", label: "Welder", plural: "Welders", blurb: "Gates, burglary proof, railings, frames" },
  { id: "tiling", label: "Tiler", plural: "Tilers", blurb: "Floor and wall tiles, screeding, grouting" },
  { id: "bricklaying", label: "Bricklayer", plural: "Bricklayers", blurb: "Block work, fences, plastering, foundations" },
  { id: "refrigeration", label: "AC and fridge technician", plural: "AC and fridge technicians", blurb: "Air conditioners, fridges, freezers, gas refills" },
  { id: "phonerepair", label: "Phone repairer", plural: "Phone repairers", blurb: "Screens, batteries, charging ports, software" },
  { id: "makeup", label: "Makeup artist", plural: "Makeup artists", blurb: "Bridal, events, photoshoots, home service" },
  { id: "baking", label: "Baker or caterer", plural: "Bakers and caterers", blurb: "Cakes, small chops, party food, orders" },
  { id: "cleaning", label: "Cleaner", plural: "Cleaners", blurb: "Home, office and post-construction cleaning" },
];

export interface State {
  id: string;
  name: string;
}

/** Every state and the FCT, and every local government area, from scripts/build-locations.mjs. */
export const STATES: State[] = locations.states.map((s) => ({ id: s.id, name: s.name }));

/**
 * Neighbourhoods in the first launch cities, kept so existing profiles and bookings still resolve. Centre points are approximate.
 * Surulere and Ikeja are not listed here: they are local governments and keep the same ids there.
 */
const NEIGHBOURHOODS: Area[] = [
  { id: "lagos-yaba", stateId: "lagos", name: "Yaba", lat: 6.5095, lng: 3.3711 },
  { id: "lagos-akoka", stateId: "lagos", name: "Akoka (near UNILAG)", lat: 6.517, lng: 3.398 },
  { id: "lagos-lekki", stateId: "lagos", name: "Lekki", lat: 6.4698, lng: 3.5852 },
  { id: "abuja-wuse", stateId: "fct", name: "Wuse", lat: 9.0765, lng: 7.4739 },
  { id: "abuja-garki", stateId: "fct", name: "Garki", lat: 9.03, lng: 7.49 },
  { id: "abuja-gwarinpa", stateId: "fct", name: "Gwarinpa", lat: 9.11, lng: 7.4 },
  { id: "abuja-gwagwalada", stateId: "fct", name: "Gwagwalada (near UniAbuja)", lat: 8.942, lng: 7.083 },
  { id: "abuja-kubwa", stateId: "fct", name: "Kubwa", lat: 9.155, lng: 7.33 },
  { id: "ph-gra", stateId: "rivers", name: "Old GRA", lat: 4.79, lng: 7.01 },
  { id: "ph-rumuokoro", stateId: "rivers", name: "Rumuokoro", lat: 4.87, lng: 7.02 },
  { id: "ph-choba", stateId: "rivers", name: "Choba (near UNIPORT)", lat: 4.893, lng: 6.922 },
  { id: "ph-rumuola", stateId: "rivers", name: "Rumuola", lat: 4.83, lng: 7.0 },
  { id: "ph-transamadi", stateId: "rivers", name: "Trans-Amadi", lat: 4.81, lng: 7.05 },
];

const LGAS: Area[] = locations.states.flatMap((s) => (s.lgas as [string, string, number, number][]).map(([id, name, lat, lng]) => ({ id, stateId: s.id, name, lat, lng })));

export const AREAS: Area[] = [...NEIGHBOURHOODS, ...LGAS];
const AREA_INDEX = new Map(AREAS.map((a) => [a.id, a]));
const STATE_INDEX = new Map(STATES.map((s) => [s.id, s]));

/** Sabihand is launching in one city for now. Everything that lists, searches or accepts an area works inside it. */
export const LAUNCH_NAME = "Port Harcourt";
export const LAUNCH_STATE_ID = "rivers";
/** Port Harcourt and the local governments that make up the city and its edges. The neighbourhoods (ph-*) are inside the city. */
const LAUNCH_LGA_IDS = ["rivers-port-harcourt", "rivers-obio-akpor", "rivers-eleme", "rivers-ikwerre", "rivers-oyigbo", "rivers-okrika"];
/** GPS only counts as "in Port Harcourt" within this distance of one of its areas. */
export const LAUNCH_RADIUS_KM = 40;

/** Kept so old links like ?area=city:Lagos still parse; they now fall back to the whole launch area. */
export const LAUNCH_CITIES: { name: string; stateId: string }[] = [{ name: LAUNCH_NAME, stateId: LAUNCH_STATE_ID }];

export const LAUNCH_AREAS: Area[] = AREAS.filter((a) => a.id.startsWith("ph-") || LAUNCH_LGA_IDS.includes(a.id));
const LAUNCH_INDEX = new Set(LAUNCH_AREAS.map((a) => a.id));
export function isLaunchArea(id: string): boolean {
  return LAUNCH_INDEX.has(id);
}

/** The most areas one artisan can list. Kano, the biggest state, has 44 local governments. */
/** "Ikeja, Lagos and 5 more" for a long list of areas. */
export function areaSummary(ids: string[], max = 3): string {
  const labels = ids.map(areaLabel).filter(Boolean);
  if (labels.length <= max) return labels.join(", ");
  return `${labels.slice(0, max).join(", ")} and ${labels.length - max} more`;
}

export const MAX_AREAS = 100;

export function areasInState(stateId: string): Area[] {
  return AREAS.filter((a) => a.stateId === stateId);
}
export function stateById(id: string): State | undefined {
  return STATE_INDEX.get(id);
}
export function areaById(id: string): Area | undefined {
  return AREA_INDEX.get(id);
}
/** "Ikeja, Lagos": local government names repeat across states, so always show the state. */
export function areaLabel(id: string): string {
  const a = AREA_INDEX.get(id);
  return a ? `${a.name}, ${STATE_INDEX.get(a.stateId)?.name ?? ""}` : "";
}
export function tradeById(id: Trade) {
  return TRADES.find((t) => t.id === id)!;
}

/** Common Nigerian banks, offered as suggestions. Free text is still accepted for the rest. */
export const BANKS = ["Access Bank", "Citibank Nigeria", "Ecobank", "Fidelity Bank", "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank", "Guaranty Trust Bank (GTBank)", "Heritage Bank", "Keystone Bank", "Kuda Bank", "Moniepoint", "OPay", "PalmPay", "Polaris Bank", "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered", "Sterling Bank", "SunTrust Bank", "Union Bank", "United Bank for Africa (UBA)", "Unity Bank", "Wema Bank", "Zenith Bank"];
