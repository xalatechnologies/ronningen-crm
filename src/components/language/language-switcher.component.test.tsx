import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
