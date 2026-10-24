import type { Area, AppState, Artisan, Booking, Trade, VerificationCheck } from "./types";
import { nairaToKobo as k } from "./money";

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
];

export const CITIES = ["Lagos", "Abuja"] as const;

export function areaById(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}
export function tradeById(id: Trade) {
  return TRADES.find((t) => t.id === id)!;
}

const D = "2026-10-12T09:00:00.000Z";

function art(
  id: string,
  name: string,
  businessName: string,
  trade: Trade,
  areaIds: string[],
  bio: string,
  availability: string,
  services: [string, number, number | null][],
  portfolio: string[],
  v: { status: "unverified" | "pending" | "verified" | "rejected"; checks?: VerificationCheck[] },
): Artisan {
  return {
    id,
    name,
    businessName,
    trade,
    areaIds,
    bio,
    availability,
    services: services.map(([title, min, max]) => ({ title, minKobo: k(min), maxKobo: max === null ? null : k(max) })),
    portfolio: portfolio.map((caption, i) => ({ id: `${id}-p${i}`, caption })),
    verification: { status: v.status, checks: v.checks ?? [], submittedAt: v.status === "unverified" ? undefined : D, decidedAt: v.status === "verified" ? D : undefined },
    joinedAt: D,
    isSample: true,
  };
}

export const SEED_ARTISANS: Artisan[] = [
  art("a1", "Tunde A.", "Tunde Plumbing Works", "plumbing", ["lagos-yaba", "lagos-akoka", "lagos-surulere"], "Fixes leaks, installs taps and water heaters. Eight years on residential jobs.", "Weekdays, 8am to 6pm", [["Fix a leaking tap", 5000, 10000], ["Install a water heater", 15000, 35000], ["Unblock a drain", 8000, 20000]], ["Kitchen tap replacement", "Bathroom pipe re-run", "Overhead tank connection"], { status: "verified", checks: ["phone", "id", "address"] }),
  art("a2", "Chidi O.", "Chidi Pipes & Fittings", "plumbing", ["lagos-ikeja", "lagos-yaba"], "Pipe repairs, tank cleaning and borehole connections.", "Mon to Sat", [["Fix a leaking tap", 6000, 15000], ["Water tank connection", 10000, 25000]], ["Tank stand and pipework", "Toilet cistern repair"], { status: "verified", checks: ["phone", "id"] }),
  art("a3", "Musa K.", "Musa Plumbing", "plumbing", ["abuja-wuse", "abuja-garki"], "General plumbing for flats and offices.", "Weekdays and Saturday mornings", [["Fix a leaking tap", 5000, 12000], ["Install a shower", 12000, 30000]], ["Shower installation", "Sink replacement"], { status: "verified", checks: ["phone", "id", "guarantor"] }),
  art("a4", "Emeka N.", "Emeka Electrical", "electrical", ["lagos-yaba", "lagos-surulere", "lagos-akoka"], "House wiring, sockets, fans and inverter connections.", "Weekdays, evenings by arrangement", [["Replace a socket or switch", 3000, 8000], ["Install a ceiling fan", 8000, 15000], ["Rewire a room", 40000, null]], ["Room rewiring", "Inverter hookup", "Distribution board change"], { status: "verified", checks: ["phone", "id", "address"] }),
  art("a5", "Sade B.", "Brightline Electrical", "electrical", ["lagos-lekki", "lagos-ikeja"], "Lighting installs and fault finding for homes and shops.", "Mon to Sat", [["Fault finding", 5000, 15000], ["Install LED lighting", 10000, 40000]], ["Shop lighting", "Security light install"], { status: "pending", checks: [] }),
  art("a6", "Ibrahim S.", "Ibrahim Electrical Services", "electrical", ["abuja-gwarinpa", "abuja-kubwa"], "Wiring and repairs, solar and inverter installs.", "Weekdays", [["Replace a socket or switch", 3000, 9000], ["Install an inverter", 20000, 60000]], ["Inverter and battery install", "Kitchen sockets"], { status: "verified", checks: ["phone", "id"] }),
  art("a7", "Bisi T.", "Bisi Stitches", "tailoring", ["lagos-yaba", "lagos-akoka"], "Alterations, native wear and school uniforms. Quick turnaround for students.", "Mon to Sat, 9am to 7pm", [["Hem or take in trousers", 1500, 3000], ["Native wear (full outfit)", 25000, 80000], ["Zip replacement", 1000, 2500]], ["Agbada set", "Ankara dress", "Uniform alterations"], { status: "verified", checks: ["phone", "id", "address"] }),
  art("a8", "Funke A.", "Funke Fashion House", "tailoring", ["lagos-surulere", "lagos-ikeja"], "Women's wear, aso-ebi sewing and alterations.", "Mon to Sat", [["Alter a dress", 2000, 6000], ["Aso-ebi (per outfit)", 15000, 45000]], ["Aso-ebi group order", "Wedding guest outfit"], { status: "unverified" }),
  art("a9", "Hauwa M.", "Hauwa Tailoring", "tailoring", ["abuja-wuse", "abuja-garki", "abuja-gwagwalada"], "Everyday alterations and kaftan sewing.", "Weekdays", [["Hem or take in", 1500, 3500], ["Kaftan (full)", 18000, 50000]], ["Kaftan set", "Suit alteration"], { status: "verified", checks: ["phone", "id"] }),
  art("a10", "Kunle F.", "Kunle Woodworks", "carpentry", ["lagos-yaba", "lagos-surulere", "lagos-ikeja"], "Doors, wardrobes, shelves and furniture repairs.", "Mon to Sat", [["Repair a door or lock", 4000, 12000], ["Build a wardrobe", 80000, null], ["Fix a wobbly table or chair", 3000, 8000]], ["Fitted wardrobe", "Door frame repair", "Study desk"], { status: "verified", checks: ["phone", "id", "address"] }),
  art("a11", "Peter E.", "Peter Carpentry", "carpentry", ["abuja-gwarinpa", "abuja-kubwa", "abuja-wuse"], "Furniture, kitchen cabinets and door fittings.", "Weekdays and Saturday", [["Repair a door or lock", 4000, 14000], ["Kitchen cabinet repair", 10000, 40000]], ["Cabinet refit", "Bed frame"], { status: "pending", checks: [] }),
  art("a12", "Ngozi U.", "Ngozi Interiors & Carpentry", "carpentry", ["lagos-lekki", "lagos-akoka"], "Shelving, TV units and custom furniture for apartments.", "By appointment", [["Mount shelves", 5000, 15000], ["TV unit (custom)", 60000, null]], ["Floating shelves", "TV console"], { status: "unverified" }),
];

const CUSTOMER = { id: "c-demo", name: "Ada (demo customer)" };

function ev(at: string, actor: "customer" | "artisan" | "admin", from: Booking["status"] | null, to: Booking["status"], note?: string) {
  return { at, actor, from, to, note };
}

export const SEED_BOOKINGS: Booking[] = [
  {
    id: "b1",
    artisanId: "a1",
    customerId: CUSTOMER.id,
    customerName: CUSTOMER.name,
    trade: "plumbing",
    areaId: "lagos-yaba",
    title: "Kitchen tap keeps dripping",
    description: "The cold tap in the kitchen drips all day. Need it replaced or fixed.",
    preferredDate: "2026-10-30",
    status: "pending_response",
    createdAt: "2026-10-23T08:00:00.000Z",
    events: [ev("2026-10-23T08:00:00.000Z", "customer", null, "pending_response")],
  },
  {
    id: "b2",
    artisanId: "a7",
    customerId: CUSTOMER.id,
    customerName: CUSTOMER.name,
    trade: "tailoring",
    areaId: "lagos-akoka",
    title: "Take in two shirts",
    description: "Two work shirts, both too loose at the waist.",
    preferredDate: "2026-10-28",
    status: "accepted",
    quote: { amountKobo: k(6000), description: "Take in two shirts at the sides, ready in 3 days", proposedDate: "2026-10-28", sentAt: "2026-10-22T10:00:00.000Z" },
    createdAt: "2026-10-22T08:00:00.000Z",
    events: [ev("2026-10-22T08:00:00.000Z", "customer", null, "pending_response"), ev("2026-10-22T10:00:00.000Z", "artisan", "pending_response", "accepted", "Quote sent")],
  },
];

export const STATE_VERSION = 1;

export function initialState(): AppState {
  return {
    version: STATE_VERSION,
    role: "customer",
    customerName: CUSTOMER.name,
    activeArtisanId: "a1",
    artisans: SEED_ARTISANS,
    bookings: SEED_BOOKINGS,
    payments: [],
    reviews: [],
    reports: [],
  };
}

export const DEMO_CUSTOMER_ID = CUSTOMER.id;
