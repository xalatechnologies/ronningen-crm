import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));

afterEach(cleanup);

describe("FinalCtaSection", () => {
  it("tells visitors where to write, with a mailto link next to the sign-up buttons", () => {
    render(<FinalCtaSection />);
    expect(screen.getByText(/Har du spørsmål\? Skriv til oss:/)).toBeTruthy();
    const link = screen.getByRole("link", { name: "info@xala.no" });
    expect(link.getAttribute("href")).toBe("mailto:info@xala.no");
    expect(screen.getByRole("link", { name: "Start gratis prøveperiode" })).toBeTruthy();
  });
});
