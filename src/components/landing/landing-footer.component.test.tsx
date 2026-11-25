import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LandingFooter } from "@/components/landing/landing-footer";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));
vi.mock("@/components/brand/brand-logo", () => ({ BrandLockup: () => <span>Event Manager</span> }));

afterEach(cleanup);

describe("LandingFooter", () => {
  it("has a contact section with a mailto link to info@xala.no", () => {
    render(<LandingFooter />);
    expect(screen.getByRole("navigation", { name: "Kontaktlenker" })).toBeTruthy();
    expect(screen.getByText("Kontakt")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Send e-post til info@xala.no" });
    expect(link.getAttribute("href")).toBe("mailto:info@xala.no");
    expect(link.textContent).toBe("info@xala.no");
  });

  it("has a phone link that dials +47 96 65 26 66", () => {
    render(<LandingFooter />);
    const link = screen.getByRole("link", { name: "Ring +47 96 65 26 66" });
    expect(link.getAttribute("href")).toBe("tel:+4796652666");
    expect(link.textContent).toBe("+47 96 65 26 66");
  });

  it("writes the credit line once, with the link in place", () => {
    const { container } = render(<LandingFooter />);
    const credit = Array.from(container.querySelectorAll("p")).find((p) => p.textContent?.includes("Utviklet av"));
    expect(credit?.textContent?.replace(/\s+/g, " ").trim()).toBe("Norsk SaaS for lokaler og utleie. Utviklet av xala.no — Xala Technologies AS.");
    expect(screen.getByRole("link", { name: "xala.no" }).getAttribute("href")).toBe("https://xala.no");
  });
});
