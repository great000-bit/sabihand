import type { Area, Trade } from "./types";

export const TRADES: { id: Trade; label: string; plural: string; blurb: string }[] = [
  { id: "plumbing", label: "Plumber", plural: "Plumbers", blurb: "Taps, pipes, tanks, water heaters" },
  { id: "electrical", label: "Electrician", plural: "Electricians", blurb: "Wiring, sockets, fans, inverters" },
  { id: "tailoring", label: "Tailor", plural: "Tailors", blurb: "Alterations, native wear, uniforms" },
  { id: "carpentry", label: "Carpenter", plural: "Carpenters", blurb: "Doors, wardrobes, repairs, furniture" },
];

export const AREAS: Area[] = [
  { id: "lagos-yaba", city: "Lagos", name: "Yaba" },
  { id: "lagos-akoka", city: "Lagos", name: "Akoka (near UNILAG)" },
  { id: "lagos-surulere", city: "Lagos", name: "Surulere" },
  { id: "lagos-ikeja", city: "Lagos", name: "Ikeja" },
  { id: "lagos-lekki", city: "Lagos", name: "Lekki" },
  { id: "abuja-wuse", city: "Abuja", name: "Wuse" },
  { id: "abuja-garki", city: "Abuja", name: "Garki" },
  { id: "abuja-gwarinpa", city: "Abuja", name: "Gwarinpa" },
  { id: "abuja-gwagwalada", city: "Abuja", name: "Gwagwalada (near UniAbuja)" },
  { id: "abuja-kubwa", city: "Abuja", name: "Kubwa" },
  { id: "ph-gra", city: "Port Harcourt", name: "Old GRA" },
  { id: "ph-rumuokoro", city: "Port Harcourt", name: "Rumuokoro" },
  { id: "ph-choba", city: "Port Harcourt", name: "Choba (near UNIPORT)" },
  { id: "ph-rumuola", city: "Port Harcourt", name: "Rumuola" },
  { id: "ph-transamadi", city: "Port Harcourt", name: "Trans-Amadi" },
];

export const CITIES = ["Lagos", "Abuja", "Port Harcourt"] as const;

/** State each launch city sits in, for labels. */
export const CITY_STATE: Record<(typeof CITIES)[number], string> = { Lagos: "Lagos State", Abuja: "FCT", "Port Harcourt": "Rivers State" };

export function areaById(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}
export function tradeById(id: Trade) {
  return TRADES.find((t) => t.id === id)!;
}
