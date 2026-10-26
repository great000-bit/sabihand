import { describe, expect, it } from "vitest";
import { askedFor, continueUrl, safeNext, signInProblem } from "./next";

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

describe("signInProblem", () => {
  it("is quiet when nothing went wrong", () => expect(signInProblem(undefined, undefined)).toBeNull());
  it("explains each way a sign-in can fail", () => {
    expect(signInProblem("expired", undefined)).toMatch(/too long/);
    expect(signInProblem("nosession", undefined)).toMatch(/could not complete/);
    expect(signInProblem("unavailable", undefined)).toMatch(/not responding/);
    expect(signInProblem("google", undefined)).toMatch(/did not finish/);
    expect(signInProblem("account_not_linked", undefined)).toMatch(/did not finish/);
  });
  it("treats a leftover one-time code as a failed sign-in", () => expect(signInProblem(undefined, "abc")).toMatch(/did not finish/));
});
