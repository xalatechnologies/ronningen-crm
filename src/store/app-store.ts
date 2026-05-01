import { create } from "zustand";

import type { ActiveWorkspace } from "@/types/app.types";

type AppState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeWorkspace: ActiveWorkspace;
  setActiveWorkspace: (workspace: ActiveWorkspace) => void;
};

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  activeWorkspace: null,
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
}));
