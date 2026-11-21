import { describe, expect, it } from "vitest";

import { conditionTone, insurancePresentation } from "@/features/assets/lib/asset-presentation";
import { csvEscape } from "@/features/assets/lib/assets-csv";
import type { Translator } from "@/i18n/types";

const t = ((key: string) => key) as unknown as Translator;

describe("conditionTone", () => {
  it("maps condition buckets to status tones", () => {
    expect(conditionTone("God")).toBe("success");
    expect(conditionTone("Akseptabel")).toBe("warning");
    expect(conditionTone("Dårlig — byttes")).toBe("danger");
    expect(conditionTone(null)).toBe("success");
  });
});

describe("insurancePresentation", () => {
  it("maps insurance status to a tone and a label", () => {
    expect(insurancePresentation("Forsikret", t)).toEqual({ safeLabel: "assets.insurance.covered", tone: "ok" });
    expect(insurancePresentation("Ikke forsikret", t)).toEqual({ safeLabel: "assets.insurance.excluded", tone: "bad" });
    expect(insurancePresentation("Ukjent", t).tone).toBe("warn");
  });

  it("keeps a custom saved status as its own label with a warning tone", () => {
    expect(insurancePresentation("Venter på polise", t)).toEqual({ safeLabel: "Venter på polise", tone: "warn" });
  });
});

describe("csvEscape", () => {
  it("quotes values with commas, quotes or line breaks", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('x "y"')).toBe('"x ""y"""');
    expect(csvEscape("plain")).toBe("plain");
  });
});
