import { describe, expect, it } from "vitest";

import { latestIso } from "./organizations";

describe("latestIso", () => {
  it("returns the newest timestamp and ignores empty values", () => {
    expect(
      latestIso(null, "2026-11-01T10:00:00.000Z", undefined, "2026-11-05T08:30:00.000Z"),
    ).toBe("2026-11-05T08:30:00.000Z");
  });

  it("returns null when nothing is set", () => {
    expect(latestIso(null, undefined)).toBeNull();
  });
});
