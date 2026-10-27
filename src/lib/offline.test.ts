import { describe, expect, it } from "vitest";
import { notFoundResponse, siteOffline } from "./offline";

describe("site offline switch", () => {
  it("is off unless SITE_OFFLINE is 1 or true", () => {
    expect(siteOffline({})).toBe(false);
    expect(siteOffline({ SITE_OFFLINE: "0" })).toBe(false);
    expect(siteOffline({ SITE_OFFLINE: "" })).toBe(false);
    expect(siteOffline({ SITE_OFFLINE: "1" })).toBe(true);
    expect(siteOffline({ SITE_OFFLINE: "true" })).toBe(true);
  });

  it("answers with the 404 page and a way back home", async () => {
    const res = notFoundResponse();
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Oops! I think we\u2019re lost");
    expect(html).toContain('href="/"');
    // Assets must come from paths the proxy lets through while the site is offline.
    expect(html).toContain('src="/brand/hand-gold.svg"');
  });
});
