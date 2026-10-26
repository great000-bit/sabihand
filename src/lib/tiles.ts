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
  { trade: "painting", label: "Painters", image: "/artisans/painter.jpg", alt: "A painter smiling as he rolls blue paint onto a wall" },
  { trade: "electrical", label: "Electricians", image: "/artisans/electrician.jpg", alt: "An electrician carrying a solar panel and inverter" },
  { trade: "makeup", label: "Makeup artists", image: "/artisans/makeup.jpg", alt: "A makeup artist applying eyeliner to a client" },
  { trade: "carpentry", label: "Carpenters", image: "/artisans/carpenter.jpg", alt: "A carpenter measuring a timber frame" },
  { trade: "welding", label: "Welders", image: "/artisans/welder.jpg", alt: "A welder in a mask joining a steel beam, with sparks flying" },
  { trade: "tailoring", label: "Tailors", image: "/artisans/tailor.jpg", alt: "A tailor at his sewing machine" },
  { trade: "mechanic", label: "Mechanics", image: "/artisans/mechanic-bosch.jpg", alt: "A mechanic leaning into the engine bay of a car" },
  { trade: "tiling", label: "Tilers", image: "/artisans/tiler.jpg", alt: "A tiler kneeling to lay large floor tiles" },
  { trade: "baking", label: "Bakers and caterers", image: "/artisans/baker.jpg", alt: "A baker in a chef's jacket holding a whisk and spatula" },
  { trade: "refrigeration", label: "AC and fridge technicians", image: "/artisans/cooling.jpg", alt: "A technician repairing the compressor at the bottom of a fridge" },
  { trade: "mechanic", label: "Mechanics", image: "/artisans/mechanic-red.jpg", alt: "A mechanic in a red shirt working on an engine" },
  { trade: "phonerepair", label: "Phone repairers", image: "/artisans/phone.jpg", alt: "A technician replacing a phone screen with fine tools" },
  { trade: "bricklaying", label: "Bricklayers", image: "/artisans/bricklayer.jpg", alt: "A bricklayer laying concrete blocks with mortar" },
  { trade: "cleaning", label: "Cleaners", image: "/artisans/cleaner.jpg", alt: "A cleaner with a mop, gloves and a bucket in a living room" },
];
