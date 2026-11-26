import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setLocaleMock = vi.fn();

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({
    locale: "nb",
    setLocale: setLocaleMock,
    t: (key: string) => {
      const labels: Record<string, string> = {
        "common.language.label": "Language",
        "common.language.chooseAria": "Choose language",
        "common.language.norwegian": "Norwegian",
        "common.language.english": "English",
        "common.language.norwegianShort": "NO",
        "common.language.englishShort": "EN",
      };
      return labels[key] ?? key;
    },
  }),
}));

import { LanguageSwitcher } from "@/components/language/language-switcher";

describe("LanguageSwitcher", () => {
  afterEach(cleanup);

  beforeEach(() => {
    setLocaleMock.mockClear();
  });

  it("compact variant switches locale", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher variant="compact" />);
    await user.click(screen.getByRole("radio", { name: "English" }));
    expect(setLocaleMock).toHaveBeenCalledWith("en");
  });

  it("marks Norwegian as active by default", () => {
    render(<LanguageSwitcher variant="compact" />);
    const norwegian = screen.getAllByRole("radio", { name: "Norwegian" });
    expect(norwegian[0]).toHaveAttribute("aria-checked", "true");
  });

  describe("sidebar variant", () => {
    it("is one button with an accessible name, dark styling for the side-bar and no light header styling", () => {
      render(<LanguageSwitcher variant="sidebar" />);
      const button = screen.getByRole("button", { name: "Language: Norwegian" });
      expect(button.textContent).toBe("Norwegian"); // the full name in the side-bar, not the short code
      expect(button.className).toContain("bg-white/10");
      expect(button.className).not.toContain("bg-muted/60");
    });

    it("opens a menu and switches the language", async () => {
      const user = userEvent.setup();
      render(<LanguageSwitcher variant="sidebar" />);
      await user.click(screen.getByRole("button", { name: "Language: Norwegian" }));
      await user.click(await screen.findByRole("menuitemradio", { name: "English" }));
      expect(setLocaleMock).toHaveBeenCalledWith("en");
    });

    it("keeps the header variant light", () => {
      render(<LanguageSwitcher variant="header" />);
      const button = screen.getByRole("button", { name: "Language: Norwegian" });
      expect(button.className).toContain("bg-muted/60");
      expect(button.className).not.toContain("bg-white/10");
    });
  });
});
