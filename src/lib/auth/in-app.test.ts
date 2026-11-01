import { describe, expect, it } from "vitest";
import { inAppBrowser } from "@/components/auth-form";

describe("in-app browser detection", () => {
  it("spots app browsers Google refuses", () => {
    expect(inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 300.0")).toBe(true);
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 13; SM-A135F Build/TP1A; wv) AppleWebKit/537.36 [FB_IAB/FB4A;FBAV/440.0]")).toBe(true);
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 12; wv) AppleWebKit/537.36 musical_ly_2023")).toBe(true);
  });
  it("leaves normal browsers alone", () => {
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")).toBe(false);
    expect(inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBe(false);
  });
});
