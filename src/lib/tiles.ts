import type { Trade } from "./types";

/**
 * The cards in the home page carousel. Each photo appears on one card only: never repeat a photo here.
 * To add one, drop the file under /public/artisans and add a line.
 */
export interface Tile {
  trade: Trade;
  label: string;
  image: string;
  alt: string;
}

export const TILES: Tile[] = [
  { trade: "plumbing", label: "Plumbers", image: "/artisans/plumber.jpg", alt: "A plumber fitting a flexible waste pipe under a kitchen sink" },
  { trade: "electrical", label: "Electricians", image: "/artisans/electrician.jpg", alt: "An electrician carrying a solar panel and inverter" },
  { trade: "tailoring", label: "Tailors", image: "/artisans/tailor.jpg", alt: "A tailor at his sewing machine" },
  { trade: "carpentry", label: "Carpenters", image: "/artisans/carpenter.jpg", alt: "A carpenter measuring a timber frame" },
];
