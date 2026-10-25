import type { Trade } from "./types";

/**
 * The tiles in the home page marquee. Add an `image` (a path under /public, e.g. "/artisans/tunde.jpg")
 * to put a photo in a tile; without one the tile stays a coloured, blank rectangle.
 */
export interface Tile {
  trade: Trade;
  label: string;
  /** Tailwind gradient classes for the tile background. */
  tone: string;
  image?: string;
  alt?: string;
}

export const TILES: Tile[] = [
  { trade: "plumbing", label: "Plumbers", tone: "from-[#2250D6] to-[#6f9bff]" },
  { trade: "electrical", label: "Electricians", tone: "from-[#E3A92B] to-[#f7d27a]" },
  { trade: "tailoring", label: "Tailors", tone: "from-[#0B7A4B] to-[#5cc59a]" },
  { trade: "carpentry", label: "Carpenters", tone: "from-[#0B1F4B] to-[#3556a8]" },
  { trade: "plumbing", label: "Plumbers", tone: "from-[#C2382C] to-[#f08a7e]" },
  { trade: "electrical", label: "Electricians", tone: "from-[#1d7fa3] to-[#6fd0e8]" },
  { trade: "tailoring", label: "Tailors", tone: "from-[#7a45d6] to-[#b793f5]" },
  { trade: "carpentry", label: "Carpenters", tone: "from-[#b5651d] to-[#ebb27a]" },
];
