import { authConfigured } from "@/lib/auth/server";
import { AUTH_WAIT_MS } from "@/lib/auth/timeout";
import { dbConfigured, sql } from "@/server/db";

export const dynamic = "force-dynamic";

/** A quick check anyone can open: is sign-in set up, and do the auth service and the database answer? No secrets are shown. */
export async function GET() {
  const started = Date.now();
  let auth: "ok" | "not set up" | "not responding" = "not set up";
  if (authConfigured) {
    try {
      const r = await fetch(`${process.env.NEON_AUTH_BASE_URL!.replace(/\/$/, "")}/ok`, { cache: "no-store", signal: AbortSignal.timeout(AUTH_WAIT_MS) });
      auth = r.status < 500 ? "ok" : "not responding";
    } catch {
      auth = "not responding";
    }
  }
  let database: "ok" | "not set up" | "not responding" = "not set up";
  if (dbConfigured) {
    try {
      await sql()`select 1`;
      database = "ok";
    } catch {
      database = "not responding";
    }
  }
  const up = auth === "ok" && database === "ok";
  return Response.json({ auth, database, ms: Date.now() - started }, { status: up ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
