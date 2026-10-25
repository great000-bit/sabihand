import { describe, expect, it } from "vitest";
import { AREAS, STATES, areaById, areaLabel, areasInState } from "./catalog";
import { distanceKm, inNigeria, nearestArea } from "./geo";

describe("Nigeria locations", () => {
  it("has every state, the FCT and all 774 local governments", () => {
    expect(STATES).toHaveLength(37);
    expect(AREAS.length).toBe(774 + 13);
    expect(areasInState("kano")).toHaveLength(44);
    expect(areasInState("lagos")).toHaveLength(20 + 3); // 20 LGAs plus 3 neighbourhoods (Yaba, Akoka, Lekki) kept from the first launch
    expect(areasInState("fct")).toHaveLength(6 + 5);
  });
  it("gives every area a unique id, a state and a point inside Nigeria", () => {
    expect(new Set(AREAS.map((a) => a.id)).size).toBe(AREAS.length);
    for (const a of AREAS) {
      expect(STATES.some((s) => s.id === a.stateId), a.id).toBe(true);
      expect(inNigeria(a.lat, a.lng), a.id).toBe(true);
      expect(a.id.length, a.id).toBeLessThanOrEqual(64);
    }
  });
  it("labels an area with its state, since names repeat across states", () => {
    expect(areaLabel("lagos-yaba")).toBe("Yaba, Lagos");
    expect(areaById("nope")).toBeUndefined();
    expect(areaById("lagos-ikeja")?.name).toBe("Ikeja"); // an id used by the first launch still resolves
  });
});

describe("GPS matching", () => {
  it("finds the nearest area for known places", () => {
    expect(nearestArea(6.6018, 3.3515)?.area.stateId).toBe("lagos"); // Ikeja
    expect(nearestArea(12.0022, 8.592)?.area.stateId).toBe("kano"); // Kano city
    expect(nearestArea(9.0765, 7.4739)?.area.stateId).toBe("fct"); // Abuja
    expect(nearestArea(4.8156, 7.0498)?.area.stateId).toBe("rivers"); // Port Harcourt
    expect(nearestArea(7.3775, 3.947)?.area.stateId).toBe("oyo"); // Ibadan
    expect(nearestArea(11.8333, 13.15)?.area.stateId).toBe("borno"); // Maiduguri
  });
  it("is zero km from an area's own centre and sensible across the country", () => {
    expect(distanceKm(6.5, 3.3, 6.5, 3.3)).toBe(0);
    expect(Math.round(distanceKm(6.5244, 3.3792, 9.0765, 7.3986))).toBeGreaterThan(480); // Lagos to Abuja is ~530 km
    expect(Math.round(distanceKm(6.5244, 3.3792, 9.0765, 7.3986))).toBeLessThan(580);
  });
  it("rejects points outside Nigeria", () => {
    expect(inNigeria(51.5, -0.12)).toBe(false); // London
    expect(inNigeria(5.6, -0.19)).toBe(false); // Accra
    expect(inNigeria(6.45, 3.39)).toBe(true);
  });
});
