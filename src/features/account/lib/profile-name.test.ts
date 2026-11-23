import { describe, expect, it } from "vitest";

import { PROFILE_NAME_MAX, isNameChanged, normalizeProfileName, profileNameError, resetCooldownLeft } from "@/features/account/lib/profile-name";

describe("profile name", () => {
  it("trims the name", () => {
    expect(normalizeProfileName("  Eva  Eier ")).toBe("Eva  Eier");
  });

  it("refuses a name that is too long, counted after trimming", () => {
    expect(profileNameError("a".repeat(PROFILE_NAME_MAX))).toBeNull();
    expect(profileNameError(` ${"a".repeat(PROFILE_NAME_MAX)} `)).toBeNull();
    expect(profileNameError("a".repeat(PROFILE_NAME_MAX + 1))).toBe("too_long");
  });

  it("sees a change only when the trimmed names differ", () => {
    expect(isNameChanged("Eva ", "Eva")).toBe(false);
    expect(isNameChanged("Eva E", "Eva")).toBe(true);
    expect(isNameChanged("", "")).toBe(false);
  });
});

describe("resetCooldownLeft", () => {
  it("is 0 before anything was sent and after the cooldown", () => {
    expect(resetCooldownLeft(null, 1000, 60)).toBe(0);
    expect(resetCooldownLeft(0, 60_000, 60)).toBe(0);
    expect(resetCooldownLeft(0, 70_000, 60)).toBe(0);
  });

  it("counts down in whole seconds, rounding up", () => {
    expect(resetCooldownLeft(0, 0, 60)).toBe(60);
    expect(resetCooldownLeft(0, 59_500, 60)).toBe(1);
  });
});
