"use client";

import { useTranslation } from "@/i18n/client";
import {
  displayDensities,
  type DisplayDensity,
} from "@/config/display";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type DisplayDensityToggleProps = {
  variant?: "segment" | "menu";
  className?: string;
};

export function DisplayDensityToggle({
  variant = "segment",
  className,
}: DisplayDensityToggleProps) {
  const { t } = useTranslation();
  const displayDensity = useAppStore((s) => s.displayDensity);
  const setDisplayDensity = useAppStore((s) => s.setDisplayDensity);

  const segment = (
    <div
      className={cn(
        "flex gap-1 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-rn-surface-segment p-1",
        variant === "menu" && "w-full",
      )}
      role="radiogroup"
      aria-label={t("settings.appearance.densityAria")}
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
              "rounded-[calc(var(--app-radius)-2px)] font-heading font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              variant === "menu"
                ? "flex-1 px-2 py-2 text-app-xs"
                : "flex-1 px-3 py-2 text-app-sm",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`settings.appearance.density.${key}`)}
          </button>
        );
      })}
    </div>
  );

  if (variant === "menu") {
    return (
      <div
        className={cn("px-3 py-2 md:px-3.5", className)}
        role="radiogroup"
        aria-label={t("settings.appearance.densityAria")}
      >
        <p className="mb-2 font-heading text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("settings.appearance.densityLabel")}
        </p>
        {segment}
      </div>
    );
  }

  return <div className={className}>{segment}</div>;
}
