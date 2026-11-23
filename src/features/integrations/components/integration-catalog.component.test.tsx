import { cleanup, render, screen } from "@testing-library/react";
import { Plug } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvailableIntegrations, IntegrationCatalog } from "@/features/integrations/components/integration-catalog";
import { INTEGRATIONS, type IntegrationDefinition } from "@/features/integrations/lib/catalog";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/server", () => ({
  getServerTranslation: async () => ({ t: createTranslator(getDictionary("nb")), locale: "nb", dictionary: getDictionary("nb") }),
}));

afterEach(cleanup);

describe("IntegrationCatalog", () => {
  it("shows every integration under its category, each marked as coming soon", async () => {
    render(await IntegrationCatalog({}));
    for (const heading of ["Regnskap", "Betaling", "Kalender", "Kommunikasjon", "Signering", "Automasjon og utvikler"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    }
    expect(screen.getByRole("heading", { name: "Fiken" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Zapier" })).toBeTruthy();
    const comingSoon = INTEGRATIONS.filter((i) => i.status === "coming_soon").length;
    expect(screen.getAllByText("Kommer snart").length).toBe(comingSoon + 1); // each card plus the section title
    expect(screen.queryByRole("heading", { name: "Stripe" })).toBeNull(); // Stripe is available, so it is not listed here
    expect(screen.queryByRole("link", { name: /Åpne/ })).toBeNull();
  });

  it("lists Stripe as available and opens the billing page", async () => {
    render(await AvailableIntegrations({}));
    expect(screen.getByRole("heading", { name: "Stripe" })).toBeTruthy();
    expect(screen.getByText("Tilgjengelig")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Åpne/ }).getAttribute("href")).toBe("/app/settings/billing");
  });

  it("shows nothing when no integration is available", async () => {
    const none: IntegrationDefinition[] = [{ id: "fiken", name: "Fiken", category: "accounting", status: "coming_soon", icon: Plug }];
    expect(await AvailableIntegrations({ items: none })).toBeNull();
  });

  it("turns a launched integration into an available card with an Open link", async () => {
    const launched: IntegrationDefinition[] = [
      { id: "fiken", name: "Fiken", category: "accounting", status: "available", icon: Plug, href: "/app/settings/integrations/fiken" },
      { id: "vipps", name: "Vipps", category: "payments", status: "coming_soon", icon: Plug },
    ];
    render(await AvailableIntegrations({ items: launched }));
    expect(screen.getByText("Tilgjengelig")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Åpne/ }).getAttribute("href")).toBe("/app/settings/integrations/fiken");
  });

  it("points to support for missing integrations", async () => {
    render(await IntegrationCatalog({}));
    expect(screen.getByRole("link", { name: "Kontakt support" }).getAttribute("href")).toBe("/app/settings/support");
  });
});
