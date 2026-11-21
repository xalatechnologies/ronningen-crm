"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

const NAV_BUTTON =
  "h-10 gap-1 rounded-xl border border-foreground/30 bg-card px-3.5 text-app-sm font-semibold shadow-none hover:bg-muted disabled:border-foreground/15";

/**
 * Footer for paged lists: a summary on the left, Previous / page / Next on the right.
 * The page state stays in the page; this only renders it. Controls hide when there is a single page.
 */
export function ListPagination({
  summary,
  page,
  totalPages,
  onPageChange,
  alwaysShowControls = false,
  summaryClassName,
  className,
}: {
  summary: ReactNode;
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  /** Keep Previous / Next visible (disabled) even when there is only one page. */
  alwaysShowControls?: boolean;
  summaryClassName?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-foreground/8 px-4 py-4 text-app-sm font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className,
      )}
    >
      <span className={summaryClassName}>{summary}</span>
      {totalPages > 1 || alwaysShowControls ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={NAV_BUTTON}
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t("common.pagination.prev")}
          </Button>
          <span className="flex items-center px-2 tabular-nums">{t("common.pagination.pageOf", { current: page, total: totalPages })}</span>
          <Button
            type="button"
            variant="outline"
            className={NAV_BUTTON}
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            {t("common.pagination.next")}
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
