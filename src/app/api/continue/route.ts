import { getViewer } from "@/server/session";
import { isArtisanAccount } from "@/server/roles";
import { askedFor } from "@/lib/auth/next";
import { welcomeOnce } from "@/server/email";
import { emailConfirmed } from "@/server/email-check";

export const dynamic = "force-dynamic";

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
  // Accounts made with email and password confirm their address with a 6-digit code before going anywhere.
  if (!(await emailConfirmed(viewer.id))) {
    const q = new URLSearchParams();
    if (want) q.set("next", want);
    if (as === "artisan") q.set("as", "artisan");
    return Response.json({ ok: true, to: `/auth/verify${q.size ? `?${q}` : ""}` }, { headers });
  }
  welcomeOnce(viewer);
  let to = "/artisans";
  const artisan = await isArtisanAccount(viewer.id);
  // An artisan asked for the customer pages (search, requests) goes to their dashboard instead.
  if (want && !(artisan && /^\/(artisans|requests)(\?|$)/.test(want))) to = want;
  else if (artisan) to = "/artisan";
  else if (as === "artisan") to = "/artisan/join";
  return Response.json({ ok: true, to }, { headers });
}
