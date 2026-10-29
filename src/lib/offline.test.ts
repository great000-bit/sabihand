import { describe, expect, it, vi } from "vitest";
import { notFoundResponse, siteOffline } from "./offline";

// The proxy is imported only for its matcher; keep the real sign-in library out of unit tests.
vi.mock("@/lib/auth/server", () => ({ authConfigured: false, getAuth: () => { throw new Error("no auth in unit tests"); } }));

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

  it("keeps the Sabihand tab icon on the 404 page", async () => {
    const html = await notFoundResponse().text();
    const icons = ["/favicon.ico", "/icon.svg", "/apple-icon.png"];
    for (const href of icons) expect(html).toContain(`href="${href}"`);
    // The proxy must let the icon files through, or they would come back as the 404 page too.
    const { config } = await import("../proxy");
    const matches = new RegExp(`^${config.matcher[0]}$`);
    for (const href of icons) expect(matches.test(href)).toBe(false);
    expect(matches.test("/artisans")).toBe(true);
  });
});
