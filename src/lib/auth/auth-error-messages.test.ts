import { describe, expect, it } from "vitest";

import { mapAuthErrorToNorwegian } from "./auth-error-messages";

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
