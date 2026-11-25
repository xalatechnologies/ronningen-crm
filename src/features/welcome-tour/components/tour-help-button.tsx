"use client";

import { CircleHelp } from "lucide-react";

import { TOUR_OPEN_EVENT } from "@/features/welcome-tour/lib/tour-events";
import { useTranslation } from "@/i18n/client";

/** Header button that opens the welcome tour again from step 1, for any account. Talks to the tour by a window event. */
export function TourHelpButton() {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      data-tour="show-tips"
      title={t("tips.helpTooltip")}
      aria-label={t("tips.helpButton")}
      onClick={() => window.dispatchEvent(new Event(TOUR_OPEN_EVENT))}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-foreground/20 bg-muted/60 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <CircleHelp className="size-5" aria-hidden />
    </button>
  );
}
