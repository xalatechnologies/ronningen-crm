"use client";

import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

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
  variant?: "menu" | "compact";
}) {
  const { locale, setLocale, t } = useTranslation();
  const compact = variant === "compact";

  const segment = (
    <div
      className={cn(
        "flex gap-1 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-rn-surface-segment p-1",
        compact && "h-9 sm:h-10",
        !compact && "w-full",
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
              "flex items-center justify-center rounded-[calc(var(--app-radius)-2px)] font-heading font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              compact
                ? "min-w-[2.5rem] px-2.5 text-app-xs sm:min-w-[2.75rem] sm:px-3"
                : "flex-1 px-2 py-2 text-app-xs",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div
        className={cn("shrink-0", className)}
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
