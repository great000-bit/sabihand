/** Only ever redirect to a path on this site. Anything else (other hosts, protocol-relative URLs) becomes the artisans page, where signed-in people land. */
export function safeNext(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/artisans";
}

/** The page a person asked for before signing in, or "" when they did not ask for one. */
export function askedFor(v: unknown): string {
  const p = safeNext(v);
  return typeof v === "string" && p === v ? p : "";
}

/** Where a signed-in person is sent to be routed on: the page they asked for, or the right home for who they are. */
export function continueUrl(asked: string, artisan: boolean): string {
  const q = new URLSearchParams();
  if (artisan) q.set("as", "artisan");
  if (asked) q.set("next", asked);
  const s = q.toString();
  return s ? `/continue?${s}` : "/continue";
}

/**
 * The error codes a failed sign-in came back with. Google's own reason is added after ours, so a cancelled
 * Google sign-in arrives as `?error=google&error=access_denied`: a list, with the most specific code last.
 */
export function signInErrorCodes(error: string | string[] | undefined): string[] {
  return (Array.isArray(error) ? error : error ? [error] : []).filter(Boolean);
}

/** The message shown on the sign-in and sign-up pages when the person arrives from a sign-in that did not finish. */
export function signInProblem(error: string | string[] | undefined, verifier: string | string[] | undefined): string | null {
  const codes = signInErrorCodes(error);
  switch (codes[codes.length - 1]) {
    case "expired":
      return "That sign-in took too long. Please try again.";
    case "nosession":
      return "We could not complete your sign-in. Please try again.";
    case "unavailable":
      return "Sign-in is not responding right now. Please try again in a moment.";
    case "access_denied":
      // The person pressed Cancel or Back on Google's page. Nothing is broken.
      return "Google sign-in was cancelled. Tap Continue with Google and choose your account to sign in.";
    case undefined:
      return verifier ? "Google sign-in did not finish. Please try again." : null;
    default:
      return "Google sign-in did not finish. Please try again.";
  }
}
