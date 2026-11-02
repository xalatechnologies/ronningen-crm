import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
