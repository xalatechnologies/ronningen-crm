"use client";

import { isDisplayDensity } from "@/config/display";
import { useAppStore } from "@/store/app-store";
import { useEffect } from "react";

function applyDensityToDocument(density: string) {
  if (typeof document === "undefined") return;
  if (isDisplayDensity(density)) {
    document.documentElement.dataset.density = density;
  }
}

/** Keeps `html[data-density]` in sync with Zustand + localStorage rehydration. */
export function DisplayDensitySync() {
  const density = useAppStore((s) => s.displayDensity);

  useEffect(() => {
    applyDensityToDocument(density);
  }, [density]);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      applyDensityToDocument(useAppStore.getState().displayDensity);
    });
    applyDensityToDocument(useAppStore.getState().displayDensity);
    return unsub;
  }, []);

  return null;
}
