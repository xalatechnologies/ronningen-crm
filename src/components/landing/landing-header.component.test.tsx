import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LandingHeader } from "@/components/landing/landing-header";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb", setLocale: vi.fn() }) }));
vi.mock("@/hooks/use-auth-user", () => ({ useAuthUser: () => ({ user: null, profile: null, loading: false, isAuthenticated: false }) }));
vi.mock("@/providers/supabase-provider", () => ({ useSupabase: () => ({ auth: { signOut: vi.fn() } }) }));
vi.mock("@/components/brand/brand-logo", () => ({ BrandLockup: () => <span>Event Manager</span> }));
vi.mock("@/components/language/language-switcher", () => ({ LanguageSwitcher: () => null }));

beforeEach(() => {
  pathname = "/";
});
afterEach(cleanup);

describe("LandingHeader", () => {
  it("sends the 'Start gratis' button to the pricing section, not straight to signup", () => {
    render(<LandingHeader />);
    expect(screen.getByRole("link", { name: "Start gratis" }).getAttribute("href")).toBe("#priser");
  });

  it("keeps section links pointing back to the home page when shown on another page", () => {
    pathname = "/vilkar";
    render(<LandingHeader />);
    expect(screen.getByRole("link", { name: "Start gratis" }).getAttribute("href")).toBe("/#priser");
    expect(screen.getAllByRole("link", { name: "Funksjoner" })[0]!.getAttribute("href")).toBe("/#funksjoner");
  });

  it("still lets people log in", () => {
    render(<LandingHeader />);
    expect(screen.getByRole("link", { name: "Logg inn" }).getAttribute("href")).toBe("/auth/login");
  });

  it("sends the mobile menu's start button to the pricing section too", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    render(<LandingHeader />);
    await userEvent.setup().click(screen.getByRole("button", { name: /meny|menu/i }));
    const cta = await screen.findByRole("link", { name: "Start gratis prøveperiode" });
    expect(cta.getAttribute("href")).toBe("#priser");
  });
});
