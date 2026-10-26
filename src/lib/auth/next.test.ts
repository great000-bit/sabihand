import { describe, expect, it } from "vitest";
import { askedFor, continueUrl, safeNext } from "./next";

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

describe("continueUrl", () => {
  it("is plain when nothing is asked", () => expect(continueUrl("", false)).toBe("/continue"));
  it("carries the artisan choice and the page asked for", () => expect(continueUrl("/requests", true)).toBe("/continue?as=artisan&next=%2Frequests"));
});
