#!/usr/bin/env node
// Builds src/data/locations.json: every state, every local government area (LGA) in Nigeria, each with a
// centre point so the GPS button can find the nearest one.
//
//   npm run locations                 # download the source list and rebuild
//   npm run locations -- ./full.json  # rebuild from a file you already have
//
// Source: github.com/temikeezy/nigeria-geojson-data (states > LGAs > wards, each ward with latitude/longitude).
// The source repository states no licence, so check the terms before relying on it commercially, and compare
// the result with the official INEC / NBS lists. An LGA's centre is the median of its wards' coordinates,
// which is not hurt by a few wrongly placed wards.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "https://raw.githubusercontent.com/temikeezy/nigeria-geojson-data/master/data/full.json";
const OUT = fileURLToPath(new URL("../src/data/locations.json", import.meta.url));
const BOUNDS = { latMin: 4.2, latMax: 13.95, lngMin: 2.6, lngMax: 14.75 }; // a box around Nigeria

/** Fixes to names in the source. */
const STATE_NAMES = { "Federal Capital Territory": "FCT (Abuja)", Nassarawa: "Nasarawa" };
const STATE_IDS = { "Federal Capital Territory": "fct", "Akwa Ibom": "akwa-ibom", "Cross River": "cross-river" };

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const inNigeria = (w) => typeof w.latitude === "number" && typeof w.longitude === "number" && w.latitude >= BOUNDS.latMin && w.latitude <= BOUNDS.latMax && w.longitude >= BOUNDS.lngMin && w.longitude <= BOUNDS.lngMax;
const r4 = (n) => Math.round(n * 1e4) / 1e4;

const raw = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : await (await fetch(SOURCE)).json();

const states = [];
const problems = [];
for (const s of raw) {
  const id = STATE_IDS[s.state] ?? slug(s.state);
  const name = STATE_NAMES[s.state] ?? s.state;
  const stateWards = s.lgas.flatMap((l) => (l.wards ?? []).filter(inNigeria));
  const fallback = stateWards.length ? [median(stateWards.map((w) => w.latitude)), median(stateWards.map((w) => w.longitude))] : null;
  const seen = new Set();
  const lgas = [];
  for (const l of s.lgas) {
    const wards = (l.wards ?? []).filter(inNigeria);
    let centre;
    if (wards.length) centre = [median(wards.map((w) => w.latitude)), median(wards.map((w) => w.longitude))];
    else if (fallback) {
      centre = fallback;
      problems.push(`${name}: ${l.name} has no usable ward coordinates; using the state centre`);
    } else continue;
    let lid = `${id}-${slug(l.name)}`;
    while (seen.has(lid)) lid += "-2";
    seen.add(lid);
    lgas.push([lid, l.name.trim(), r4(centre[0]), r4(centre[1])]);
  }
  lgas.sort((a, b) => a[1].localeCompare(b[1]));
  states.push({ id, name, lgas });
}
states.sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(OUT, JSON.stringify({ generatedFrom: SOURCE, states }) + "\n");
const total = states.reduce((n, s) => n + s.lgas.length, 0);
console.log(`Wrote ${OUT}: ${states.length} states/FCT, ${total} LGAs.`);
if (states.length !== 37) console.warn(`Expected 37 states (36 + FCT), got ${states.length}`);
if (total !== 774) console.warn(`Expected 774 LGAs, got ${total}`);
for (const p of problems) console.warn(p);
