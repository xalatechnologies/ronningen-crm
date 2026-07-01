"use client";

import type { ThemePreference } from "@/config/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { ChevronDown, Monitor, Moon, Sun } from "lucide-react";

const themeOptions: {
  value: ThemePreference;
  labelKey: "common.theme.light" | "common.theme.dark" | "common.theme.system";
  icon: typeof Sun;
}[] = [
  { value: "light", labelKey: "common.theme.light", icon: Sun },
  { value: "dark", labelKey: "common.theme.dark", icon: Moon },
  { value: "system", labelKey: "common.theme.system", icon: Monitor },
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
  const { t } = useTranslation();

  const options = themeOptions.map((opt) => ({
    ...opt,
    label: t(opt.labelKey),
  }));

  if (variant === "header") {
    const current =
      options.find((option) => option.value === theme) ?? options[0];
    const CurrentIcon = current.icon;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-rn-surface-segment px-2 outline-none transition-colors sm:h-10 sm:gap-1.5 sm:px-2.5",
            "hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "data-popup-open:bg-muted/30",
            className,
          )}
          aria-label={`${t("common.theme.label")}: ${current.label}`}
          title={current.label}
        >
          <CurrentIcon className="size-4 shrink-0 text-foreground" aria-hidden />
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground opacity-70"
            aria-hidden
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-44 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-popover p-2 shadow-rn-card"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5 font-heading text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("common.theme.label")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => {
                if (!value) return;
                setTheme(value as ThemePreference);
              }}
            >
              {options.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem
                  key={value}
                  value={value}
                  className="gap-2 font-heading text-app-sm font-medium"
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === "menu") {
    return (
      <div
        className={cn("px-3 py-2 md:px-3.5", className)}
        role="radiogroup"
        aria-label={t("common.theme.chooseAria")}
      >
        <p className="mb-2 font-heading text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("common.theme.label")}
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
      aria-label={t("common.theme.chooseAria")}
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
