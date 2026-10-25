import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, getAuth } from "@/lib/auth/server";

/**
 * Finishes Google sign-in. Google sends people back to the page they asked for with a one-time code in the address;
 * the auth middleware swaps that code for a session cookie and removes it from the address. Every other request
 * passes straight through, so pages keep deciding for themselves who may see them.
 */
export default async function proxy(req: NextRequest) {
  if (!authConfigured || !req.nextUrl.searchParams.has("neon_auth_session_verifier")) return NextResponse.next();
  return getAuth().middleware({ loginUrl: "/auth/sign-in" })(req);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|artisans/.*\\.(?:jpg|jpeg|png|webp|svg)).*)"],
};
