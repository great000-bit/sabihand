import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("sign-in proxy", () => {
  // With an src folder, Next only picks the proxy up from src/. At the project root it is silently ignored,
  // and the return trip from Google never completes (people land back on the sign-in page).
  it("sits in src/, not at the project root", () => {
    expect(existsSync(join(process.cwd(), "src/proxy.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "proxy.ts"))).toBe(false);
  });
});
