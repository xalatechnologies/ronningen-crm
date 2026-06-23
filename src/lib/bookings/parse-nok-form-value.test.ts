import { describe, expect, it } from "vitest";

import { parseNokFormValue } from "@/lib/bookings/parse-nok-form-value";

describe("parseNokFormValue", () => {
  it("parses numbers", () => {
    expect(parseNokFormValue(90_000)).toBe(90_000);
  });

  it("parses numeric strings", () => {
    expect(parseNokFormValue("5000")).toBe(5000);
  });

  it("returns 0 for invalid input", () => {
    expect(parseNokFormValue("")).toBe(0);
    expect(parseNokFormValue(NaN)).toBe(0);
  });
});
