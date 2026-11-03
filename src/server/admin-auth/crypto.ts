import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Only well-known building blocks from Node's crypto module: scrypt for passwords (OWASP parameters), random tokens
 * stored as SHA-256 hashes, and RFC 6238 one-time codes. Nothing home-made.
 */

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw.normalize("NFKC"), salt, len, opts, (e, k) => (e ? rej(e) : res(k))));

// OWASP Password Storage Cheat Sheet: scrypt N=2^17, r=8, p=1.
const N = 1 << 17;
const R = 8;
const P = 1;
const KEYLEN = 64;
const maxmem = 256 * 1024 * 1024;

export async function hashPassword(pw: string, cost = { N, r: R, p: P }): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, KEYLEN, { ...cost, maxmem });
  return `scrypt$${cost.N}$${cost.r}$${cost.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(pw, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A hash of a password nobody knows: checked when the email is unknown, so both answers take the same time. */
let dummy: Promise<string> | null = null;
export const dummyHash = () => (dummy ??= hashPassword(randomBytes(24).toString("hex")));

export const newToken = () => randomBytes(32).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/* ---------------------------------------------------------------- RFC 4648 base32 + RFC 6238 TOTP */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$|\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const i = B32.indexOf(c);
    if (i < 0) throw new Error("bad base32");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

/** RFC 4226 HOTP with SHA-1, 6 digits: what every authenticator app uses. */
export function hotp(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const code = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

export const totpStep = (ms = Date.now()) => Math.floor(ms / 1000 / 30);

/**
 * Checks a 6-digit code against the current 30-second step and one step either side (clock drift). Returns the step
 * that matched, or null. The caller refuses any step at or before the last one used, so a code works once.
 */
export function checkTotp(secret: string, code: string, lastStep: number, ms = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const now = totpStep(ms);
  for (const s of [now - 1, now, now + 1]) {
    if (s <= lastStep) continue;
    const a = Buffer.from(hotp(secret, s));
    if (timingSafeEqual(a, Buffer.from(code))) return s;
  }
  return null;
}
