import { describe, expect, it } from "vitest";
import { GREETINGS, ROTATE_MS, dayPart, greetingAt } from "./greetings";

describe("dashboard greetings", () => {
  it("picks the time of day", () => {
    expect(dayPart(7)).toBe("morning");
    expect(dayPart(13)).toBe("afternoon");
    expect(dayPart(20)).toBe("evening");
  });
  it("moves to the next language every 30 seconds and wraps", () => {
    const langs = Array.from({ length: GREETINGS.length + 1 }, (_, i) => greetingAt(i * ROTATE_MS, 9).language);
    expect(new Set(langs.slice(0, GREETINGS.length)).size).toBe(GREETINGS.length);
    expect(langs[GREETINGS.length]).toBe(langs[0]);
    expect(greetingAt(ROTATE_MS - 1, 9).language).toBe(greetingAt(0, 9).language);
  });
  it("has words for every part of the day", () => {
    for (const g of GREETINGS) for (const p of ["morning", "afternoon", "evening"] as const) expect(g.text[p].length).toBeGreaterThan(2);
  });
});
