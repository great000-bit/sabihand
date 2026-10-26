import { describe, expect, it } from "vitest";
import { askedFor, safeNext } from "./next";

describe("askedFor", () => {
  it("keeps a page on this site", () => expect(askedFor("/artisan/join")).toBe("/artisan/join"));
  it("returns nothing when no page was asked for", () => {
    expect(askedFor(undefined)).toBe("");
    expect(askedFor("")).toBe("");
  });
  it("refuses other hosts and tricks", () => {
    expect(askedFor("https://evil.example")).toBe("");
    expect(askedFor("//evil.example")).toBe("");
    expect(askedFor("/\\evil")).toBe("");
  });
  it("safeNext still falls back to the artisans page", () => expect(safeNext("https://evil.example")).toBe("/artisans"));
});
