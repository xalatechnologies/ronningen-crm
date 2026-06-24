import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  defaultDisplayDensity,
  displayStorageKey,
  type DisplayDensity,
} from "@/config/display";
import { defaultTheme, type ThemePreference } from "@/config/theme";

type AppState = {
  displayDensity: DisplayDensity;
  setDisplayDensity: (density: DisplayDensity) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      displayDensity: defaultDisplayDensity,
      setDisplayDensity: (displayDensity) => set({ displayDensity }),
      theme: defaultTheme,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: displayStorageKey,
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as {
          theme?: ThemePreference;
          displayDensity?: DisplayDensity;
        };
        if (state.theme === "system") {
          return { ...state, theme: "light" as const };
        }
        return state;
      },
      partialize: (state) => ({
        displayDensity: state.displayDensity,
        theme: state.theme,
      }),
    },
  ),
);
