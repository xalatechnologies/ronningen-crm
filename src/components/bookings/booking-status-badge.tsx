"use client";

import type { BookingStatus } from "@/components/bookings/types";
import { useTranslation } from "@/i18n/client";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { cn } from "@/lib/utils";

const pill =
  "inline-flex items-center rounded-full px-3 py-1.5 text-app-xs font-bold tracking-wide uppercase md:px-3.5 md:py-2 md:text-app-sm";

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  const label = statusLabel(status, t);

  if (status === "confirmed") {
    return (
      <span
        className={cn(
          pill,
          "border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
          className,
        )}
      >
        <span className="mr-2 size-1.5 rounded-full bg-emerald-600" />
        {label}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className={cn(
          pill,
          "border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
          className,
        )}
      >
        <span className="mr-2 size-1.5 rounded-full bg-amber-500" />
        {label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        pill,
        "border border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
        className,
      )}
    >
      <span className="mr-2 size-1.5 rounded-full bg-red-600" />
      {label}
    </span>
  );
}
