"use client";

import { addMonths, addYears, format } from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import { nb } from "date-fns/locale/nb";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

const dateFnsLocales = { nb, en: enGB };

const navButtonClass =
  "size-11 min-h-[max(2.75rem,var(--app-tap-target-min))] min-w-[max(2.75rem,var(--app-tap-target-min))] shrink-0 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong";

export type CalendarPopoverMonthNavProps = {
  viewMonth: Date;
  onViewMonthChange: (next: Date | ((prev: Date) => Date)) => void;
  className?: string;
};

/**
 * Shared month/year header for date and datetime picker popovers.
 * Pattern: « ‹  Month Year  › »
 */
export function CalendarPopoverMonthNav({
  viewMonth,
  onViewMonthChange,
  className,
}: CalendarPopoverMonthNavProps) {
  const { t, locale } = useTranslation();
  const dateFnsLocale = dateFnsLocales[locale];

  return (
    <div
      className={cn(
        "mb-2 flex h-11 items-center justify-between gap-1 px-1",
        className,
      )}
      role="toolbar"
      aria-label={t("calendar.navAria")}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={navButtonClass}
          aria-label={t("calendar.prevYear")}
          onClick={() => onViewMonthChange((m) => addYears(m, -1))}
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={navButtonClass}
          aria-label={t("calendar.prevMonth")}
          onClick={() => onViewMonthChange((m) => addMonths(m, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
      </div>
      <span className="min-w-0 flex-1 truncate px-1 text-center text-app-control font-semibold capitalize tabular-nums">
        {format(viewMonth, "LLLL yyyy", { locale: dateFnsLocale })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={navButtonClass}
          aria-label={t("calendar.nextMonth")}
          onClick={() => onViewMonthChange((m) => addMonths(m, 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={navButtonClass}
          aria-label={t("calendar.nextYear")}
          onClick={() => onViewMonthChange((m) => addYears(m, 1))}
        >
          <ChevronsRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
