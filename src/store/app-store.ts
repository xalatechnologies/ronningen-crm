import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  defaultDisplayDensity,
  displayStorageKey,
  type DisplayDensity,
} from "@/config/display";
import type { ActiveWorkspace } from "@/types/app.types";

type AppState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeWorkspace: ActiveWorkspace;
  setActiveWorkspace: (workspace: ActiveWorkspace) => void;
  displayDensity: DisplayDensity;
  setDisplayDensity: (density: DisplayDensity) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      activeWorkspace: null,
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      displayDensity: defaultDisplayDensity,
      setDisplayDensity: (displayDensity) => set({ displayDensity }),
    }),
    {
      name: displayStorageKey,
      partialize: (state) => ({ displayDensity: state.displayDensity }),
    },
  ),
);
