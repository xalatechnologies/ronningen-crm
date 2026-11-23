import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsHub } from "@/components/settings/settings-hub";
import { computeSetupProgress, type SetupFacts } from "@/features/settings/lib/setup-progress";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

let role: "owner" | "member" = "owner";

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }),
}));
vi.mock("@/hooks/use-current-organization", () => ({
  useCurrentOrganization: () => ({
    loading: false,
    currentOrganization: { name: "Test Lokale", subscriptionStatus: "trialing", subscriptionPlan: "standard" },
  }),
}));
vi.mock("@/hooks/use-organization-permissions", () => ({ useOrganizationPermissions: () => ({ role }) }));

const facts: SetupFacts = {
  profile: { org_number: "1", address_line1: "a", city: "b", contact_email: "c@d.no", contact_phone: null },
  propertyCount: 1,
  memberCount: 1,
  hasContractTemplate: true,
  subscriptionStatus: "trialing",
  billingExempt: false,
  hasCalendarFeed: false,
  portalEnabled: false,
  hasLogo: true,
};

afterEach(cleanup);

describe("SettingsHub", () => {
  it("groups the sections, shows the plan display name and marks what is missing", () => {
    role = "owner";
    render(<SettingsHub propertyCount={2} teamCount={1} setup={computeSetupProgress(facts)} />);
    expect(screen.getByText("Komplett")).toBeTruthy();
    for (const heading of ["Virksomheten", "Avtaler og betaling", "Konto og support"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    }
    const business = screen.getByRole("region", { name: "Virksomheten" });
    expect(within(business).getByRole("link", { name: /Organisasjon/ }).getAttribute("href")).toBe("/app/settings/organization");
    // Team has no second member yet: a "Mangler" chip. Organisasjon is done: a check mark with a label.
    expect(within(within(business).getByRole("link", { name: /Team/ })).getByText("Mangler")).toBeTruthy();
    expect(within(within(business).getByRole("link", { name: /Organisasjon/ })).getByRole("img", { name: "Fullført" })).toBeTruthy();
  });

  it("shows no setup card for people who cannot manage the organization", () => {
    role = "member";
    render(<SettingsHub propertyCount={2} teamCount={1} setup={null} />);
    expect(screen.queryByText("Oppsett av organisasjonen")).toBeNull();
    expect(screen.queryByText("Mangler")).toBeNull();
    expect(screen.getByRole("region", { name: "Konto og support" })).toBeTruthy();
  });
});
