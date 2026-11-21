import { describe, expect, it } from "vitest";

import {
  filterPartners,
  partnerCategoryLabel,
  partnerCategorySuggestions,
  partnerLabelToCategoryLocalized,
} from "@/features/customers/lib/partner-categories";
import type { PartnerRow } from "@/features/customers/types";
import type { Translator } from "@/i18n/types";

const labels: Record<string, string> = {
  "customers.partnerCategories.catering": "Catering",
  "customers.partnerCategories.decoration": "Dekorasjon",
  "customers.partnerCategories.cleaning": "Renhold",
  "customers.partnerCategories.other": "Annet",
};
const t = ((key: string) => labels[key] ?? key) as unknown as Translator;

const partner = (name: string, category: string, email: string | null = null, phone: string | null = null): PartnerRow =>
  ({ id: name, name, category, email, phone }) as unknown as PartnerRow;

describe("partner categories", () => {
  it("shows the translated label for a preset and the raw text for a custom category", () => {
    expect(partnerCategoryLabel("decoration", t)).toBe("Dekorasjon");
    expect(partnerCategoryLabel("Musikk", t)).toBe("Musikk");
  });

  it("turns a typed label (translated or stored) back into the preset value", () => {
    expect(partnerLabelToCategoryLocalized("  renhold ", t)).toBe("cleaning");
    expect(partnerLabelToCategoryLocalized("Catering", t)).toBe("catering");
    expect(partnerLabelToCategoryLocalized("  Musikk ", t)).toBe("Musikk");
  });

  it("suggests the translated labels in preset order", () => {
    expect(partnerCategorySuggestions(t)).toEqual(["Catering", "Dekorasjon", "Renhold", "Annet"]);
  });
});

describe("filterPartners", () => {
  const list = [partner("Alejandra", "other", "a@x.no", "123"), partner("EDH", "cleaning"), partner("Smakslykke", "catering")];

  it("keeps everyone for an empty query", () => {
    expect(filterPartners(list, " ", t)).toHaveLength(3);
  });

  it("searches name, e-mail, phone and the translated category", () => {
    expect(filterPartners(list, "alej", t).map((p) => p.name)).toEqual(["Alejandra"]);
    expect(filterPartners(list, "renhold", t).map((p) => p.name)).toEqual(["EDH"]);
    expect(filterPartners(list, "123", t).map((p) => p.name)).toEqual(["Alejandra"]);
    expect(filterPartners(list, "CATERING", t).map((p) => p.name)).toEqual(["Smakslykke"]);
  });
});
