import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  defaultDisplayDensity,
  displayStorageKey,
  type DisplayDensity,
} from "@/config/display";
import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";
import { defaultTheme, type ThemePreference } from "@/config/theme";

type AppState = {
  displayDensity: DisplayDensity;
  setDisplayDensity: (density: DisplayDensity) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      displayDensity: defaultDisplayDensity,
      setDisplayDensity: (displayDensity) => set({ displayDensity }),
      theme: defaultTheme,
      setTheme: (theme) => set({ theme }),
      locale: defaultLocale,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: displayStorageKey,
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as {
          theme?: ThemePreference;
          displayDensity?: DisplayDensity;
          locale?: Locale;
        };
        if (state.theme === "system") {
          return { ...state, theme: "light" as const };
        }
        return {
          ...state,
          locale: state.locale ?? defaultLocale,
        };
      },
      partialize: (state) => ({
        displayDensity: state.displayDensity,
        theme: state.theme,
        locale: state.locale,
      }),
    },
  ),
);
