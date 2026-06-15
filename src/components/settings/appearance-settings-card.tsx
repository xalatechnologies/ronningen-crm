"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Label } from "@/components/ui/label";
import {
  displayDensities,
  type DisplayDensity,
} from "@/config/display";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { Palette } from "lucide-react";

const densityLabels: Record<DisplayDensity, string> = {
  compact: "Kompakt",
  comfortable: "Normal",
  spacious: "Romslig",
};

export function AppearanceSettingsCard() {
  const displayDensity = useAppStore((s) => s.displayDensity);
  const setDisplayDensity = useAppStore((s) => s.setDisplayDensity);

  return (
    <section className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6 lg:col-span-2")}>
      <div className="flex items-start gap-3 border-b border-rn-border-strong/50 pb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rn-border-strong/70 bg-muted/30 text-muted-foreground">
          <Palette className="size-5" aria-hidden />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
            Utseende
          </h2>
          <p className="mt-1 text-app-sm text-muted-foreground">
            Tilpass fargetema og visningstetthet i appen.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fargetema
          </Label>
          <ThemeToggle />
        </div>

        <div className="space-y-3">
          <Label className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visningstetthet
          </Label>
          <div
            className="flex flex-wrap gap-1 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-rn-surface-segment p-1"
            role="radiogroup"
            aria-label="Velg visningstetthet"
          >
            {(Object.keys(displayDensities) as DisplayDensity[]).map((key) => {
              const active = displayDensity === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDisplayDensity(key)}
                  className={cn(
                    "flex-1 rounded-[calc(var(--app-radius)-2px)] px-3 py-2 font-heading text-app-sm font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {densityLabels[key]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
