"use client";

import { ChevronDown } from "lucide-react";

import { useTranslation } from "@/i18n/client";

const APPS = ["google", "apple", "outlook"] as const;

/** Short steps for adding the feed to the three most common calendar apps. */
export function CalendarSetupHelp() {
  const { t } = useTranslation();
  return (
    <details className="group rounded-xl ring-1 ring-foreground/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-app-sm font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        {t("settings.integrations.calendarFeed.howTitle")}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-4 border-t border-foreground/10 px-4 py-4 md:grid-cols-3">
        {APPS.map((app) => (
          <div key={app}>
            <h3 className="text-app-sm font-semibold text-foreground">{t(`settings.integrations.calendarFeed.how.${app}.title`)}</h3>
            <p className="mt-1 text-app-sm leading-relaxed text-muted-foreground">{t(`settings.integrations.calendarFeed.how.${app}.steps`)}</p>
          </div>
        ))}
        <p className="text-app-xs text-muted-foreground md:col-span-3">{t("settings.integrations.calendarFeed.howNote")}</p>
      </div>
    </details>
  );
}
