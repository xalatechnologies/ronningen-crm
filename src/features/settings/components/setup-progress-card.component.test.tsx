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
  it("shows the percentage, a next-step button, the open steps as links and the finished steps", () => {
    render(<SetupProgressCard progress={computeSetupProgress(partial)} />);
    expect(screen.getByText("63 %")).toBeTruthy();
    expect(screen.getByText("5 av 8 fullført")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("63");

    // The first open step is offered as one button at the top.
    const next = screen.getByRole("link", { name: /Neste steg: Team/ });
    expect(next.getAttribute("href")).toBe("/app/settings/team");
    // Every open step is also a row that links to its settings page.
    expect(screen.getAllByRole("link", { name: /Team/ })).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Kalenderfeed/ }).getAttribute("href")).toBe("/app/settings/integrations");
    expect(screen.getByRole("link", { name: /Kundeportal/ }).getAttribute("href")).toBe("/app/settings/kontrakter");
    // Finished steps are listed in one line and are not links.
    expect(screen.getByText(/Organisasjon · Lokaler/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Organisasjon/ })).toBeNull();
  });

  it("shows one quiet line with 100 % and no links when everything is set up", () => {
    const all = computeSetupProgress({ ...partial, memberCount: 2, hasCalendarFeed: true, portalEnabled: true });
    render(<SetupProgressCard progress={all} />);
    expect(screen.getByText("100 %")).toBeTruthy();
    expect(screen.getByText(/Alt er på plass/)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
