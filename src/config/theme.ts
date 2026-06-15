import { displayStorageKey } from "@/config/display";

export const themeStorageKey = displayStorageKey;

export type ThemePreference = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

export const defaultTheme: ThemePreference = "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

export function applyThemeToDocument(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved === "dark");
}
