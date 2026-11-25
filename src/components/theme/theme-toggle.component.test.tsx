import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setThemeMock = vi.fn();

vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: setThemeMock,
  }),
}));

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "common.theme.label": "Theme",
        "common.theme.light": "Light",
        "common.theme.dark": "Dark",
        "common.theme.system": "System",
        "common.theme.chooseAria": "Choose theme",
      };
      return labels[key] ?? key;
    },
  }),
}));

import { ThemeToggle } from "@/components/theme/theme-toggle";

describe("ThemeToggle", () => {
  afterEach(cleanup);

  beforeEach(() => {
    setThemeMock.mockClear();
  });

  it("segment variant exposes radiogroup with theme options", () => {
    render(<ThemeToggle variant="segment" />);
    const group = screen.getByRole("radiogroup", { name: "Choose theme" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("calls setTheme when dark is selected", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle variant="segment" />);
    const darkButtons = screen.getAllByRole("radio", { name: "Dark" });
    await user.click(darkButtons[0]!);
    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  describe("sidebar variant", () => {
    it("is one button naming the current theme, with dark styling for the side-bar", () => {
      render(<ThemeToggle variant="sidebar" />);
      const button = screen.getByRole("button", { name: "Theme: Light" });
      expect(button.className).toContain("bg-white/10");
      expect(button.className).not.toContain("bg-muted/60");
    });

    it("opens a menu and changes the theme", async () => {
      const user = userEvent.setup();
      render(<ThemeToggle variant="sidebar" />);
      await user.click(screen.getByRole("button", { name: "Theme: Light" }));
      await user.click(await screen.findByRole("menuitemradio", { name: "Dark" }));
      expect(setThemeMock).toHaveBeenCalledWith("dark");
    });

    it("keeps the header variant light", () => {
      render(<ThemeToggle variant="header" />);
      expect(screen.getByRole("button", { name: "Theme: Light" }).className).toContain("bg-muted/60");
    });
  });
});
