import type { BookingStatus } from "@/components/bookings/types";
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
  if (status === "confirmed") {
    return (
      <span
        className={cn(
          pill,
          "border border-emerald-200 bg-emerald-50 text-emerald-900",
          className,
        )}
      >
        <span className="mr-2 size-1.5 rounded-full bg-emerald-600" />
        Bekreftet
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className={cn(
          pill,
          "border border-amber-200 bg-amber-50 text-amber-900",
          className,
        )}
      >
        <span className="mr-2 size-1.5 rounded-full bg-amber-500" />
        Avventer
      </span>
    );
  }
  return (
    <span
      className={cn(
        pill,
        "border border-red-200 bg-red-50 text-red-900",
        className,
      )}
    >
      <span className="mr-2 size-1.5 rounded-full bg-red-600" />
      Avbestilt
    </span>
  );
}
