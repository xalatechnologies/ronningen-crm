import { describe, expect, it } from "vitest";

import { mapAuthErrorToNorwegian, mapAuthErrorToUserMessage } from "./auth-error-messages";

describe("mapAuthErrorToNorwegian", () => {
  it("translates email rate limit", () => {
    const msg = mapAuthErrorToNorwegian({
      message: "email rate limit exceeded",
    });
    expect(msg).toContain("Vent minst én time");
  });

  it("translates duplicate registration", () => {
    const msg = mapAuthErrorToNorwegian({
      message: "User already registered",
    });
    expect(msg).toContain("allerede en konto");
  });

  it("translates invalid email", () => {
    const msg = mapAuthErrorToNorwegian({
      message: 'Email address "post@example.no" is invalid',
    });
    expect(msg).toContain("E-postadressen ble avvist");
  });
});

describe("mapAuthErrorToUserMessage", () => {
  it("explains a banned account in plain language instead of the raw Supabase text", () => {
    const nb = mapAuthErrorToUserMessage({ message: "User is banned", code: "user_banned" }, "nb");
    expect(nb).not.toMatch(/banned/i);
    expect(nb).toMatch(/deaktivert/i);
    expect(mapAuthErrorToUserMessage({ message: "User is banned" }, "en")).toMatch(/deactivated/i);
  });

  it("keeps the existing wrong-password message", () => {
    expect(mapAuthErrorToUserMessage({ message: "Invalid login credentials" }, "nb")).toBe(
      "Feil e-post eller passord.",
    );
  });
});
