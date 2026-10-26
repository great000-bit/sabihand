import { describe, expect, it } from "vitest";
import { TimeoutError, authPaused, pauseAuth, resumeAuth, withTimeout } from "./timeout";

describe("withTimeout", () => {
  it("passes the result through when the work is quick", async () => {
    await expect(withTimeout(Promise.resolve(7), 50, "quick")).resolves.toBe(7);
  });
  it("rejects when the work is too slow", async () => {
    await expect(withTimeout(new Promise((r) => setTimeout(r, 200)), 20, "slow")).rejects.toThrow(/slow took longer/);
  });
  it("passes failures through", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 50, "x")).rejects.toThrow("boom");
  });
});

describe("auth pause", () => {
  it("skips the auth service briefly after a timeout, then tries again", () => {
    resumeAuth();
    expect(authPaused(1000)).toBe(false);
    pauseAuth(1000);
    expect(authPaused(1001)).toBe(true);
    expect(authPaused(1000 + 21_000)).toBe(false);
    resumeAuth();
    expect(authPaused(1001)).toBe(false);
  });
  it("tells a timeout apart from other failures", async () => {
    await expect(withTimeout(new Promise(() => {}), 10, "x")).rejects.toBeInstanceOf(TimeoutError);
  });
});
