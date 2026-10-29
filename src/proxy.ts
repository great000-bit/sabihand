import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, getAuth } from "@/lib/auth/server";
import { AUTH_WAIT_MS, authPaused, pauseAuth, resumeAuth, withTimeout } from "@/lib/auth/timeout";
import { notFoundResponse, siteOffline } from "@/lib/offline";

const middleware = () => getAuth().middleware({ loginUrl: "/auth/sign-in" });

/**
 * Keeps people signed in, in two situations. Every other request passes straight through, and pages decide for
 * themselves who may see them.
 *
 * 1. Coming back from Google. Google sends people to the page they asked for with a one-time code in the address;
 *    the auth middleware swaps that code for a session cookie and removes it from the address.
 * 2. Refreshing the short-lived session cache. The signed-in cookie lasts a week, but its cached copy lasts five
 *    minutes. Pages are not allowed to set cookies, so this is the one place the cache can be renewed. Without it
 *    a person looks signed out five minutes after signing in.
 *
 * While the site is switched off (SITE_OFFLINE, see lib/offline.ts) every page gets the 404 page instead.
 */
export default async function proxy(req: NextRequest) {
  if (siteOffline()) return notFoundResponse();
  if (!authConfigured) return NextResponse.next();
  const names = req.cookies.getAll().map((c) => c.name);

  if (req.nextUrl.searchParams.has("neon_auth_session_verifier")) {
    // The code only works with the challenge cookie set when sign-in began. If the person waited too long on
    // Google's page, or the cookie was dropped, say so instead of showing a signed-out page with a stray code in the address.
    if (!names.some((n) => n.includes("session_challenge"))) {
      const back = req.nextUrl.pathname;
      const to = req.nextUrl.clone();
      to.pathname = "/auth/sign-in";
      to.search = `?error=expired${back !== "/" && !back.startsWith("/auth") && !back.startsWith("/continue") ? `&next=${encodeURIComponent(back)}` : ""}`;
      return NextResponse.redirect(to);
    }
    try {
      return await withTimeout(Promise.resolve(middleware()(req)), AUTH_WAIT_MS * 2, "sign-in exchange");
    } catch (e) {
      console.error("sign-in exchange failed", e);
      pauseAuth();
      const to = req.nextUrl.clone();
      to.pathname = "/auth/sign-in";
      to.search = "?error=unavailable";
      return NextResponse.redirect(to);
    }
  }

  const hasToken = names.some((n) => n.endsWith("session_token"));
  const hasCache = names.some((n) => n.endsWith("session_data"));
  if (!hasToken || hasCache || authPaused()) return NextResponse.next();

  try {
    const res = await withTimeout(Promise.resolve(middleware()(req)), AUTH_WAIT_MS, "session refresh");
    resumeAuth();
    const to = res.headers.get("location");
    if (!to) return res;
    // The middleware would send a signed-out person to the sign-in page. This site is public, so keep going,
    // but still hand back any cookies it wanted to change.
    const pass = NextResponse.next();
    for (const c of res.headers.getSetCookie()) pass.headers.append("Set-Cookie", c);
    return pass;
  } catch (e) {
    console.error("session refresh failed", e);
    pauseAuth();
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|brand|artisans/.*\\.(?:jpg|jpeg|png|webp|svg)).*)"],
};
