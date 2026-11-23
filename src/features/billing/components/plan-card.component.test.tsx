import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlanCard } from "@/features/billing/components/plan-card";
import { BILLING_PLANS } from "@/config/billing-plans";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({
    t: createTranslator(getDictionary("nb")),
    locale: "nb",
    formatCurrency: (n: number) => `${n} kr`,
  }),
}));

afterEach(cleanup);

describe("PlanCard", () => {
  it("shows the price with the unit once, not 'kr kr/mnd'", () => {
    const { container } = render(<PlanCard plan={BILLING_PLANS.standard} />);
    const price = container.querySelector("p.text-2xl");
    expect(price?.textContent?.replace(/\s+/g, " ").trim()).toBe("750 kr/mnd");
    expect(screen.getByText("Komplett")).toBeTruthy();
  });
});

describe("PlanCard features", () => {
  it("lists the customer portal", () => {
    render(<PlanCard plan={BILLING_PLANS.standard} />);
    expect(screen.getByText("Kundeportal")).toBeTruthy();
  });
});
