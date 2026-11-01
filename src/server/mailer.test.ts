import { describe, expect, it } from "vitest";
import { emailProvider, parseSender, requestFor } from "./mailer";

const mail = { to: "ada@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

describe("mailer", () => {
  it("is off without a sender or key, prefers Brevo, and honours EMAIL_PROVIDER", () => {
    expect(emailProvider({})).toBeNull();
    expect(emailProvider({ BREVO_API_KEY: "k" })).toBeNull();
    expect(emailProvider({ EMAIL_FROM: "a@b.c", BREVO_API_KEY: "k", RESEND_API_KEY: "r" })).toBe("brevo");
    expect(emailProvider({ EMAIL_FROM: "a@b.c", RESEND_API_KEY: "r" })).toBe("resend");
    expect(emailProvider({ EMAIL_FROM: "a@b.c", BREVO_API_KEY: "k", RESEND_API_KEY: "r", EMAIL_PROVIDER: "resend" })).toBe("resend");
    expect(emailProvider({ EMAIL_FROM: "a@b.c", BREVO_API_KEY: "k", EMAIL_PROVIDER: "resend" })).toBeNull();
  });
  it("reads the sender name and address", () => {
    expect(parseSender("Sabihand <hello@gmail.com>")).toEqual({ name: "Sabihand", email: "hello@gmail.com" });
    expect(parseSender('"Team Linkers" <x@y.z>')).toEqual({ name: "Team Linkers", email: "x@y.z" });
    expect(parseSender("x@y.z")).toEqual({ name: "Sabihand", email: "x@y.z" });
  });
  it("builds a Brevo request", () => {
    const { url, init } = requestFor("brevo", mail, { BREVO_API_KEY: "key1", EMAIL_FROM: "Sabihand <s@gmail.com>" });
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("key1");
    expect(JSON.parse(init.body as string)).toEqual({ sender: { name: "Sabihand", email: "s@gmail.com" }, to: [{ email: "ada@example.com" }], subject: "Hi", htmlContent: "<p>Hi</p>", textContent: "Hi" });
  });
});
