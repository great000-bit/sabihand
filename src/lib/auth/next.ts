/** Only ever redirect to a path on this site. Anything else (other hosts, protocol-relative URLs) becomes the artisans page, where signed-in people land. */
export function safeNext(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/artisans";
}
