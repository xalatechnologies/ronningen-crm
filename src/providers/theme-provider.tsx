"use client";

import {
  applyThemeToDocument,
  defaultTheme,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/config/theme";
import { useAppStore } from "@/store/app-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const themeCycle: ThemePreference[] = ["light", "dark", "system"];

function subscribeToSystemPreference(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function useResolvedTheme(preference: ThemePreference): ResolvedTheme {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (preference !== "system") return () => {};
      return subscribeToSystemPreference(onStoreChange);
    },
    [preference],
  );

  return useSyncExternalStore(
    subscribe,
    () => resolveTheme(preference),
    () => "light",
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const setThemePreference = useAppStore((s) => s.setTheme);
  const resolvedTheme = useResolvedTheme(theme);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      applyThemeToDocument(resolveTheme(useAppStore.getState().theme));
    });
    return unsub;
  }, []);

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setThemePreference(next);
      applyThemeToDocument(resolveTheme(next));
    },
    [setThemePreference],
  );

  const toggleTheme = useCallback(() => {
    const currentIndex = themeCycle.indexOf(theme);
    const next = themeCycle[(currentIndex + 1) % themeCycle.length] ?? defaultTheme;
    setTheme(next);
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
