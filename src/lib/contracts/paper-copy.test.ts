import { describe, expect, it } from "vitest";

import { resolvedLegalTerms } from "@/lib/contracts/paper-copy";

describe("resolvedLegalTerms", () => {
  it("returns an organization's own terms unchanged, even without the legacy headings", () => {
    const terms = "1. Vilkår\n• Betal i tide.";
    expect(resolvedLegalTerms(terms)).toBe(terms);
  });

  it("trims but never replaces the text", () => {
    expect(resolvedLegalTerms("  4. Betingelser\n• Test \n")).toBe("4. Betingelser\n• Test");
  });

  it("never leaks another organization's wording when the text is empty", () => {
    for (const empty of ["", "   ", null, undefined]) {
      const result = resolvedLegalTerms(empty);
      expect(result).toBe("");
      expect(result).not.toMatch(/Rønningen|Fest2019/);
    }
  });
});
