import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SubscriptionCard } from "@/features/billing/components/subscription-card";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));

const handlers = { onCheckout: vi.fn(), onRefresh: vi.fn(), onPortal: vi.fn() };

const trial = {
  planName: "Komplett",
  status: "trialing",
  periodEndLabel: "5. desember 2026",
  daysLeft: 12,
  billingOn: true,
  billingExempt: false,
  isOwner: true,
  hasStripeSubscription: false,
  showCheckout: false,
  showCheckoutCta: true,
  showPortal: false,
  noNotice: false,
  primaryCtaLabel: "Legg til betaling",
  busy: false,
  syncing: false,
  devIds: null,
  ...handlers,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SubscriptionCard", () => {
  it("shows plan, status, trial end and days left", () => {
    render(<SubscriptionCard {...trial} />);
    expect(screen.getByText("Komplett")).toBeTruthy();
    expect(screen.getByText("Prøveperiode")).toBeTruthy();
    expect(screen.getByText("Prøveperioden slutter")).toBeTruthy();
    expect(screen.getByText("5. desember 2026")).toBeTruthy();
    expect(screen.getByText("12 dager igjen")).toBeTruthy();
  });

  it("lets the owner start checkout and refresh the status", () => {
    render(<SubscriptionCard {...trial} />);
    fireEvent.click(screen.getByRole("button", { name: "Legg til betaling" }));
    fireEvent.click(screen.getByRole("button", { name: "Oppdater status" }));
    expect(handlers.onCheckout).toHaveBeenCalledTimes(1);
    expect(handlers.onRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables the payment button while busy", () => {
    render(<SubscriptionCard {...trial} busy />);
    expect((screen.getByRole("button", { name: "Åpner betaling…" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("tells a non-owner that only the owner can pay, and offers no buttons", () => {
    render(<SubscriptionCard {...trial} isOwner={false} showCheckout />);
    expect(screen.getByText(/Kun organisasjonseieren/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers the Stripe portal for an active subscription", () => {
    render(<SubscriptionCard {...trial} status="active" daysLeft={null} hasStripeSubscription showCheckoutCta={false} showPortal noNotice />);
    fireEvent.click(screen.getByRole("button", { name: /Administrer i Stripe/ }));
    expect(handlers.onPortal).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Gjeldende periode til")).toBeTruthy();
    expect(screen.queryByText(/dager igjen/)).toBeNull();
  });

  it("offers no actions for an exempt organization", () => {
    render(<SubscriptionCard {...trial} billingExempt />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("points to support when billing is off", () => {
    render(<SubscriptionCard {...trial} billingOn={false} showCheckoutCta={false} />);
    expect(screen.getByRole("link", { name: "Kontakt support" }).getAttribute("href")).toBe("/app/settings/support");
  });
});
