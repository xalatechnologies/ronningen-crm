"use client";

import type { ThemePreference } from "@/config/theme";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";

const options: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Lys", icon: Sun },
  { value: "dark", label: "Mørk", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

type ThemeToggleProps = {
  /** Compact icon row for app header */
  variant?: "segment" | "menu" | "header";
  className?: string;
};

export function ThemeToggle({
  variant = "segment",
  className,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (variant === "header") {
    return (
      <div
        className={cn(
          "inline-flex shrink-0 gap-0.5 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-rn-surface-segment p-0.5",
          className,
        )}
        role="radiogroup"
        aria-label="Velg fargetema"
      >
        {options.map(({ value, label, icon: Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
              onClick={() => setTheme(value)}
              className={cn(
                "flex size-9 items-center justify-center rounded-[calc(var(--app-radius)-2px)] transition-colors sm:size-10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "menu") {
    return (
      <div
        className={cn("px-3 py-2 md:px-3.5", className)}
        role="radiogroup"
        aria-label="Velg fargetema"
      >
        <p className="mb-2 font-heading text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fargetema
        </p>
        <div className="flex gap-1 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-rn-surface-segment p-1">
          {options.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--app-radius)-2px)] px-2 py-2 font-heading text-app-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex gap-1 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-rn-surface-segment p-1",
        className,
      )}
      role="radiogroup"
      aria-label="Velg fargetema"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-[calc(var(--app-radius)-2px)] px-3 py-2 font-heading text-app-sm font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
