import { createNeonAuth } from "@neondatabase/auth/next/server";

/** True when the Neon Auth env vars are set. Without them the app stays in pure demo mode. */
export const authConfigured = Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);

let instance: ReturnType<typeof createNeonAuth> | null = null;

export function getAuth() {
  if (!authConfigured) throw new Error("Neon Auth is not configured (NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET)");
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
  return instance;
}

/** The auth service's health page, which the sign-in page pings from the browser to see if Google sign-in can work. */
export function authProbeUrl(): string | undefined {
  const base = process.env.NEON_AUTH_BASE_URL;
  return base ? `${base.replace(/\/$/, "")}/ok` : undefined;
}

