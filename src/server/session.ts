import { cache } from "react";
import { headers } from "next/headers";
import type { Viewer } from "@/lib/types";
import { authConfigured, getAuth } from "@/lib/auth/server";
import { AUTH_WAIT_MS, TimeoutError, authPaused, pauseAuth, resumeAuth, withTimeout } from "@/lib/auth/timeout";
import { dbConfigured, sql } from "./db";

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/**
 * The signed-in person, resolved on the server from the session cookie.
 * Super admins are named in SUPER_ADMIN_USER_IDS. Admins are those a super admin added (app.admins), plus anyone in
 * ADMIN_USER_IDS, or ADMIN_EMAILS when the address is verified. A super admin is always an admin.
 */
async function addedAsAdmin(id: string): Promise<boolean> {
  if (!dbConfigured) return false;
  try {
    const r = (await sql()`select 1 from app.admins where user_id = ${id} limit 1`) as unknown[];
    return r.length > 0;
  } catch {
    return false; // the table may not exist yet; nobody is an admin then
  }
}

type SessionUser = { id: string; name?: string | null; email?: string | null; image?: string | null; emailVerified?: boolean };

/**
 * Reads the session straight from the auth service without trying to set cookies. The library's own getSession
 * renews cookies as a side effect, which pages are not allowed to do; when that fails this still gives the answer.
 */
async function readSessionUser(): Promise<SessionUser | null> {
  const h = await headers();
  const cookie = (h.get("cookie") ?? "")
    .split(/;\s*/)
    .filter((c) => c.startsWith("__Secure-neon-auth."))
    .join("; ");
  if (!cookie.includes("session_token")) return null;
  const base = process.env.NEON_AUTH_BASE_URL!.replace(/\/$/, "");
  const origin = h.get("origin") || `https://${h.get("x-forwarded-host") ?? h.get("host") ?? ""}`;
  const r = await fetch(`${base}/get-session`, { headers: { Cookie: cookie, Origin: origin }, cache: "no-store", signal: AbortSignal.timeout(AUTH_WAIT_MS) });
  if (!r.ok) return null;
  const body = (await r.json().catch(() => null)) as { user?: SessionUser } | null;
  return body?.user ?? null;
}

async function sessionUser() {
  if (authPaused()) return null; // the auth service just timed out; do not make every page wait again
  try {
    const { data } = await withTimeout(getAuth().getSession(), AUTH_WAIT_MS, "getSession");
    resumeAuth();
    return data?.user ?? null;
  } catch (e) {
    if (e instanceof TimeoutError) {
      console.error("auth service too slow, carrying on signed out", e);
      pauseAuth();
      return null;
    }
    // Usually the library trying to renew cookies where pages may not: read the session directly instead.
    console.error("getSession failed, reading the session directly", e);
    try {
      return await readSessionUser();
    } catch (e2) {
      console.error("direct session read failed too", e2);
      pauseAuth();
      return null;
    }
  }
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!authConfigured) return null;
  try {
    const u = await sessionUser();
    if (!u) return null;
    const email = String(u.email ?? "");
    const id = String(u.id);
    const isSuperAdmin = list(process.env.SUPER_ADMIN_USER_IDS).includes(id.toLowerCase());
    const isAdmin = isSuperAdmin || list(process.env.ADMIN_USER_IDS).includes(id.toLowerCase()) || (u.emailVerified === true && list(process.env.ADMIN_EMAILS).includes(email.toLowerCase())) || (await addedAsAdmin(id));
    const image = typeof u.image === "string" && /^https:\/\//.test(u.image) ? u.image : undefined;
    return { id, name: String(u.name || email.split("@")[0] || "Customer"), email, image, isAdmin, isSuperAdmin };
  } catch (e) {
    console.error("could not read the signed-in person", e);
    return null;
  }
});
