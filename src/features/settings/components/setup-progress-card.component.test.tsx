import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SetupProgressCard } from "@/features/settings/components/setup-progress-card";
import { computeSetupProgress, type SetupFacts } from "@/features/settings/lib/setup-progress";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }),
}));

const partial: SetupFacts = {
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

describe("SetupProgressCard", () => {
  it("shows the percentage, the open steps as links and the finished steps", () => {
    render(<SetupProgressCard progress={computeSetupProgress(partial)} />);
    expect(screen.getByText("63 %")).toBeTruthy();
    expect(screen.getByText("5 av 8 fullført")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("63");

    const team = screen.getByRole("link", { name: /Team/ });
    expect(team.getAttribute("href")).toBe("/app/settings/team");
    expect(screen.getByRole("link", { name: /Kalenderfeed/ }).getAttribute("href")).toBe("/app/settings/integrations");
    expect(screen.getByRole("link", { name: /Kundeportal/ }).getAttribute("href")).toBe("/app/settings/kontrakter");
    // The first open step is marked as the next step.
    expect(within(team).getByText("Neste steg")).toBeTruthy();
    // Finished steps are not links.
    expect(screen.queryByRole("link", { name: /Organisasjon/ })).toBeNull();
    expect(screen.getByText("Organisasjon")).toBeTruthy();
  });

  it("shows a done message and no to-do list when everything is set up", () => {
    const all = computeSetupProgress({ ...partial, memberCount: 2, hasCalendarFeed: true, portalEnabled: true });
    render(<SetupProgressCard progress={all} />);
    expect(screen.getByText("100 %")).toBeTruthy();
    expect(screen.getByText(/Alt er på plass/)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
