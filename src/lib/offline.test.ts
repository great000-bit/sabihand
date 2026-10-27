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

  it("answers with a plain, unbranded 404 page", async () => {
    const res = notFoundResponse();
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("This page could not be found.");
    expect(html.toLowerCase()).not.toContain("sabihand");
  });
});
