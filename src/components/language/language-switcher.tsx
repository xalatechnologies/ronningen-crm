"use client";

import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const localeOptions = ["nb", "en"] as const;

function localeLabel(
  value: (typeof localeOptions)[number],
  t: ReturnType<typeof useTranslation>["t"],
  compact: boolean,
) {
  if (compact) {
    return value === "nb"
      ? t("common.language.norwegianShort")
      : t("common.language.englishShort");
  }
  return value === "nb"
    ? t("common.language.norwegian")
    : t("common.language.english");
}

export function LanguageSwitcher({
  className,
  variant = "menu",
}: {
  className?: string;
  variant?: "menu" | "compact" | "segment" | "header";
}) {
  const { locale, setLocale, t } = useTranslation();
  const compact = variant === "compact";
  const segmentStyle = variant === "segment";

  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-foreground/20 bg-muted/60 px-3 font-heading text-xs font-semibold text-foreground outline-none transition-colors",
            "hover:bg-muted focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "data-popup-open:bg-muted/30",
            className,
          )}
          aria-label={`${t("common.language.label")}: ${localeLabel(locale, t, false)}`}
          title={localeLabel(locale, t, false)}
        >
          <Globe className="size-4 shrink-0" aria-hidden />
          {localeLabel(locale, t, true)}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-48 rounded-2xl border border-foreground/10 bg-popover p-2 shadow-lg"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 py-2 font-heading text-app-xs font-semibold text-muted-foreground">
              {t("common.language.label")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(value) => {
                if (value === "nb" || value === "en") setLocale(value);
              }}
            >
              {localeOptions.map((value) => (
                <DropdownMenuRadioItem
                  key={value}
                  value={value}
                  className="gap-2.5 rounded-lg px-3 py-2.5 font-heading text-app-sm font-medium"
                >
                  {localeLabel(value, t, false)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const segment = (
    <div
      className={cn(
        "grid gap-1 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-rn-surface-segment p-1",
        compact ? "inline-grid h-9 grid-flow-col sm:h-10" : "w-full min-w-0 grid-cols-2",
      )}
    >
      {localeOptions.map((value) => {
        const active = locale === value;
        const label = localeLabel(value, t, compact);
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={localeLabel(value, t, false)}
            title={localeLabel(value, t, false)}
            onClick={() => setLocale(value)}
            className={cn(
              "flex min-w-0 items-center justify-center rounded-[calc(var(--app-radius)-2px)] font-heading font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              compact
                ? "min-w-[2.5rem] px-2.5 text-app-xs sm:min-w-[2.75rem] sm:px-3"
                : segmentStyle
                  ? "px-3 py-2 text-app-sm"
                  : "px-2 py-2.5 text-app-xs",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );

  if (compact || segmentStyle) {
    return (
      <div
        className={cn(compact && "shrink-0", className)}
        role="radiogroup"
        aria-label={t("common.language.chooseAria")}
      >
        {segment}
      </div>
    );
  }

  return (
    <div
      className={cn("px-3 py-2 md:px-3.5", className)}
      role="radiogroup"
      aria-label={t("common.language.chooseAria")}
    >
      <p className="mb-2 font-heading text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("common.language.label")}
      </p>
      {segment}
    </div>
  );
}
