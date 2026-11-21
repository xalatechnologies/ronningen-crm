import { describe, expect, it } from "vitest";

import { csvEscape } from "@/features/finance/lib/finance-csv";
import { categoryPillClass, financeCategorySuggestions } from "@/features/finance/lib/finance-category";
import type { Translator } from "@/i18n/types";

describe("csvEscape", () => {
  it("quotes values with commas, quotes or line breaks and doubles inner quotes", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("finance categories", () => {
  it("maps known categories to status styles and everything else to neutral", () => {
    expect(categoryPillClass("Depositum")).toContain("status-success");
    expect(categoryPillClass("Vedlikehold")).toContain("status-warning");
    expect(categoryPillClass("Skatt")).toContain("status-info");
    expect(categoryPillClass("renhold")).toContain("status-neutral");
  });

  it("builds one suggestion per category id through the translator", () => {
    const t = ((key: string) => key) as unknown as Translator;
    const suggestions = financeCategorySuggestions(t);
    expect(suggestions).toHaveLength(9);
    expect(suggestions[0]).toBe("finance.categories.income");
  });
});
