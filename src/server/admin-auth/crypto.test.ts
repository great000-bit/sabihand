import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, checkTotp, hashPassword, hotp, totpStep, verifyPassword } from "./crypto";
import { passwordProblem } from "@/lib/password-policy";

const fast = { N: 1 << 10, r: 8, p: 1 };

describe("admin crypto", () => {
  it("hashes and verifies passwords with scrypt", async () => {
    const h = await hashPassword("correct horse battery staple", fast);
    expect(h.startsWith("scrypt$1024$8$1$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", h)).toBe(true);
    expect(await verifyPassword("correct horse battery stapl", h)).toBe(false);
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    // Same password, different salt.
    expect(await hashPassword("same", fast)).not.toBe(await hashPassword("same", fast));
  });

  it("round-trips base32", () => {
    const b = Buffer.from("12345678901234567890");
    expect(base32Encode(b)).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode(base32Encode(b)).equals(b)).toBe(true);
  });

  it("matches the RFC 4226 / RFC 6238 test vectors", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(hotp(secret, 0)).toBe("755224");
    expect(hotp(secret, 9)).toBe("520489");
    // RFC 6238, T = 59s -> 94287082 (8 digits), 6-digit tail 287082
    expect(hotp(secret, totpStep(59_000))).toBe("287082");
  });

  it("accepts a code once, within one step of drift", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    const at = 1_111_111_109_000;
    const step = totpStep(at);
    const code = hotp(secret, step);
    expect(checkTotp(secret, code, 0, at)).toBe(step);
    expect(checkTotp(secret, code, step, at)).toBeNull(); // already used
    expect(checkTotp(secret, hotp(secret, step - 1), 0, at)).toBe(step - 1);
    expect(checkTotp(secret, hotp(secret, step - 3), 0, at)).toBeNull();
    expect(checkTotp(secret, "12345", 0, at)).toBeNull();
  });
});

describe("password policy", () => {
  it("wants long passphrases and nothing guessable", () => {
    expect(passwordProblem("short")).toMatch(/at least 15/);
    expect(passwordProblem("aaaaaaaaaaaaaaaaaa")).toMatch(/repeats/);
    expect(passwordProblem("MyPassword-is-long-1")).toMatch(/common/);
    expect(passwordProblem("greatemmanwori-river-lamp", "greatemmanwori@gmail.com")).toMatch(/email/);
    expect(passwordProblem("river lamp orange 1234 x")).toMatch(/runs/);
    expect(passwordProblem("tangerine-otter-walks-quietly")).toBeNull();
  });
});
