import { describe, expect, it } from "vitest";

import {
  REMEMBER_MAX_AGE_SECONDS,
  isRemembered,
  withSessionLifetime,
} from "./session-lifetime";

describe("isRemembered", () => {
  it("is on unless explicitly switched off", () => {
    expect(isRemembered(undefined)).toBe(true);
    expect(isRemembered("1")).toBe(true);
    expect(isRemembered("0")).toBe(false);
  });
});

describe("withSessionLifetime", () => {
  it("gives remembered sessions 30 days and drops expires", () => {
    const out = withSessionLifetime({ path: "/", maxAge: 400 * 86400, expires: new Date(2030, 0, 1) }, true);
    expect(out.maxAge).toBe(REMEMBER_MAX_AGE_SECONDS);
    expect(out.expires).toBeUndefined();
    expect(out.path).toBe("/");
  });

  it("makes a browser-session cookie when not remembered", () => {
    const out = withSessionLifetime({ path: "/", maxAge: 400 * 86400 }, false);
    expect(out.maxAge).toBeUndefined();
    expect(out.expires).toBeUndefined();
  });

  it("leaves cookie deletions alone", () => {
    expect(withSessionLifetime({ maxAge: 0 }, true).maxAge).toBe(0);
    const past = new Date(1000);
    expect(withSessionLifetime({ expires: past }, false).expires).toBe(past);
  });
});
