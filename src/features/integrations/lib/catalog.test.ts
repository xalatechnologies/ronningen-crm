import { describe, expect, it } from "vitest";

import { getDictionary } from "@/i18n/dictionaries";
import {
  INTEGRATIONS,
  INTEGRATION_CATEGORIES,
  groupIntegrations,
  type IntegrationDefinition,
} from "@/features/integrations/lib/catalog";
import { Plug } from "lucide-react";

describe("INTEGRATIONS", () => {
  it("has unique ids", () => {
    const ids = INTEGRATIONS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a description and a category label in both languages for every entry", () => {
    for (const locale of ["nb", "en"] as const) {
      const section = getDictionary(locale).appPages.settings.integrations as unknown as {
        catalog: Record<string, string>;
        categories: Record<string, string>;
      };
      for (const item of INTEGRATIONS) {
        expect(section.catalog[item.id], `${locale} description for ${item.id}`).toBeTruthy();
      }
      for (const category of INTEGRATION_CATEGORIES) {
        expect(section.categories[category], `${locale} label for ${category}`).toBeTruthy();
      }
    }
  });

  it("gives every available integration a place to open", () => {
    for (const item of INTEGRATIONS.filter((i) => i.status === "available")) {
      expect(item.href, item.id).toBeTruthy();
    }
  });
});

describe("groupIntegrations", () => {
  const item = (id: string, category: IntegrationDefinition["category"]): IntegrationDefinition => ({
    id,
    name: id,
    category,
    status: "coming_soon",
    icon: Plug,
  });

  it("groups by category in page order and drops empty categories", () => {
    const groups = groupIntegrations([item("zap", "automation"), item("fik", "accounting"), item("trip", "accounting")]);
    expect(groups.map((g) => g.category)).toEqual(["accounting", "automation"]);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["fik", "trip"]);
  });

  it("shows every catalog entry exactly once", () => {
    const shown = groupIntegrations().flatMap((g) => g.items.map((i) => i.id));
    expect(shown.sort()).toEqual(INTEGRATIONS.map((i) => i.id).sort());
  });
});
