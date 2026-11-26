import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SetupChecklistCard } from "@/features/setup-checklist/components/setup-checklist-card";
import type { SetupFacts } from "@/features/setup-checklist/lib/setup-checklist";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

const state: { role: string | null; facts: SetupFacts | null | undefined } = { role: "owner", facts: undefined };
const ORG = "org-1";

vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));
vi.mock("@/hooks/use-current-organization", () => ({ useCurrentOrganization: () => ({ currentRole: state.role, currentOrganizationId: ORG }) }));
vi.mock("@/hooks/use-tenant-page-queries", () => ({ useSetupFactsQuery: () => ({ data: state.facts }) }));
vi.mock("@/lib/billing/constants", () => ({ isBillingEnabled: () => true }));

const empty: SetupFacts = {
  profile: { org_number: null, address_line1: null, city: null, contact_email: null, contact_phone: null, bank_account: null, payment_instructions: null },
  propertyCount: 0,
  priceCount: 0,
  memberCount: 1,
  invitationCount: 0,
  inquiryCount: 0,
  bookingCount: 0,
  hasSubscription: false,
};

const allDone: SetupFacts = {
  profile: { org_number: "1", address_line1: "a", city: "b", contact_email: "c", contact_phone: null, bank_account: "1", payment_instructions: null },
  propertyCount: 1,
  priceCount: 1,
  memberCount: 2,
  invitationCount: 0,
  inquiryCount: 1,
  bookingCount: 0,
  hasSubscription: true,
};

beforeEach(() => {
  state.role = "owner";
  state.facts = empty;
  window.localStorage.clear();
});
afterEach(cleanup);

describe("SetupChecklistCard", () => {
  it("shows the percent, the steps done and every step, with the first open step as the next one", () => {
    render(<SetupChecklistCard />);
    expect(screen.getByText("13 % ferdig")).toBeTruthy();
    expect(screen.getByText("1 av 8 steg")).toBeTruthy();
    const bar = screen.getByRole("progressbar", { name: "Fremdrift i oppsettet" });
    expect(bar.getAttribute("aria-valuenow")).toBe("13");
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    const next = screen.getByRole("listitem", { current: "step" });
    expect(within(next).getByText("Fyll ut virksomhetsinfo")).toBeTruthy();
    expect(within(next).getByRole("link", { name: /Neste steg/ }).getAttribute("href")).toBe("/app/settings/organization");
  });

  it("links each open step to the page where it is done, and gives done steps no link", () => {
    render(<SetupChecklistCard />);
    const items = screen.getAllByRole("listitem");
    const venue = items.find((i) => within(i).queryByText("Registrer et lokale"));
    expect(within(venue!).getByRole("link", { name: /Gjør dette/ }).getAttribute("href")).toBe("/app/settings/lokaler");
    const created = items.find((i) => within(i).queryByText("Opprett organisasjon"));
    expect(within(created!).queryByRole("link")).toBeNull();
  });

  it("moves on as steps are done", () => {
    state.facts = { ...empty, propertyCount: 1, profile: { ...empty.profile, org_number: "1", address_line1: "a", city: "b", contact_email: "c" } };
    render(<SetupChecklistCard />);
    expect(screen.getByText("3 av 8 steg")).toBeTruthy();
    expect(within(screen.getByRole("listitem", { current: "step" })).getByText("Legg inn priser")).toBeTruthy();
  });

  it("shows nothing when every step was already done before this browser ever saw the checklist", () => {
    state.facts = allDone;
    const { container } = render(<SetupChecklistCard />);
    expect(container.textContent).toBe("");
  });

  it.each([["staff"], ["viewer"], [null]])("is not shown to the role %s, who cannot change the setup", (role) => {
    state.role = role;
    const { container } = render(<SetupChecklistCard />);
    expect(container.textContent).toBe("");
  });

  it.each([[undefined], [null]])("shows nothing while loading or when the data cannot be read (%s)", (facts) => {
    state.facts = facts;
    const { container } = render(<SetupChecklistCard />);
    expect(container.textContent).toBe("");
  });

  describe("when the last step is done", () => {
    it("replaces the checklist with a message once, for someone who saw it unfinished", async () => {
      const { rerender } = render(<SetupChecklistCard />);
      expect(screen.getByText("13 % ferdig")).toBeTruthy();
      state.facts = allDone;
      await act(async () => rerender(<SetupChecklistCard />));
      expect(screen.getByRole("status", { name: "Oppsettet er ferdig" })).toBeTruthy();
      expect(screen.queryByRole("progressbar")).toBeNull();
    });

    it("stays gone after the message is closed, also after a reload", async () => {
      const user = userEvent.setup();
      const { rerender, unmount } = render(<SetupChecklistCard />);
      state.facts = allDone;
      await act(async () => rerender(<SetupChecklistCard />));
      await user.click(screen.getByRole("button", { name: "Lukk" }));
      expect(screen.queryByRole("status")).toBeNull();
      unmount();
      const { container } = render(<SetupChecklistCard />);
      expect(container.textContent).toBe("");
    });

    it("does not show the message to someone who never saw the checklist unfinished", () => {
      state.facts = allDone;
      render(<SetupChecklistCard />);
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("brings the checklist back, and not the message, if a step is undone again", async () => {
      const { rerender } = render(<SetupChecklistCard />);
      state.facts = allDone;
      await act(async () => rerender(<SetupChecklistCard />));
      state.facts = { ...allDone, propertyCount: 0 };
      await act(async () => rerender(<SetupChecklistCard />));
      expect(screen.getByRole("progressbar")).toBeTruthy();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("does not break when the browser blocks storage", () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new Error("blocked");
      };
      try {
        expect(() => render(<SetupChecklistCard />)).not.toThrow();
        expect(screen.getByRole("progressbar")).toBeTruthy();
      } finally {
        Storage.prototype.setItem = original;
      }
    });

    it("keeps the message per organization, so closing it for one does not close it for another", () => {
      window.localStorage.setItem("setup-checklist:other-org:dismissed", "1");
      window.localStorage.setItem(`setup-checklist:${ORG}:seenIncomplete`, "1");
      state.facts = allDone;
      render(<SetupChecklistCard />);
      expect(screen.getByRole("status", { name: "Oppsettet er ferdig" })).toBeTruthy();
    });
  });
});
