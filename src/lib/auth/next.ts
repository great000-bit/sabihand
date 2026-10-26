/** Only ever redirect to a path on this site. Anything else (other hosts, protocol-relative URLs) becomes the artisans page, where signed-in people land. */
export function safeNext(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/artisans";
}

/** The page a person asked for before signing in, or "" when they did not ask for one. */
export function askedFor(v: unknown): string {
  const p = safeNext(v);
  return typeof v === "string" && p === v ? p : "";
}
