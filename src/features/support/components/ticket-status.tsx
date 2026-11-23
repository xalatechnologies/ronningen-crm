"use client";

import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/client";
import type { SupportTicketStatus } from "@/lib/support/labels";

export const TICKET_TONE: Record<SupportTicketStatus, StatusTone> = {
  open: "info",
  waiting: "warning",
  resolved: "success",
};

export function TicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  const { t } = useTranslation();
  return <StatusBadge tone={TICKET_TONE[status]}>{t(`support.status.${status}`)}</StatusBadge>;
}
