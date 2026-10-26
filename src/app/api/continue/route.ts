import { getViewer } from "@/server/session";
import { dbConfigured, sql } from "@/server/db";
import { askedFor } from "@/lib/auth/next";

export const dynamic = "force-dynamic";

async function hasArtisanProfile(userId: string): Promise<boolean> {
  if (!dbConfigured) return false;
  try {
    return ((await sql()`select 1 from app.artisans where owner_id = ${userId} limit 1`) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

/**
 * Where a person goes after signing in: a page they asked for, their jobs if they are an artisan, the artisan sign-up
 * steps if they came to join, and otherwise the list of artisans. The sign-in screen asks this while it plays, so the
 * screen itself never waits on a lookup. `ok: false` means there is no session: the sign-in did not complete.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const want = askedFor(url.searchParams.get("next") ?? undefined);
  const as = url.searchParams.get("as");
  const viewer = await getViewer();
  const headers = { "Cache-Control": "no-store" };
  if (!viewer) return Response.json({ ok: false, to: `/auth/sign-in?error=nosession${want ? `&next=${encodeURIComponent(want)}` : ""}` }, { headers });
  let to = "/artisans";
  if (want) to = want;
  else if (await hasArtisanProfile(viewer.id)) to = "/artisan";
  else if (as === "artisan") to = "/artisan/join";
  return Response.json({ ok: true, to }, { headers });
}
