"use client";

import type { BookingStatus } from "@/components/bookings/types";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/client";
import { statusLabel } from "@/lib/navigation/nav-labels";

const TONE: Record<string, StatusTone> = {
  confirmed: "success",
  pending: "warning",
};

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <StatusBadge size="lg" tone={TONE[status] ?? "danger"} className={className}>
      {statusLabel(status, t)}
    </StatusBadge>
  );
}
