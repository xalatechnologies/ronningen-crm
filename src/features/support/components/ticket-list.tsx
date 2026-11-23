"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/client";
import { statusDotClass } from "@/components/ui/status-badge";
import { TICKET_TONE } from "@/features/support/components/ticket-status";
import { lastMessage, previewText } from "@/features/support/lib/ticket-view";
import { formatRelativeTime } from "@/lib/dates/conversation-time";
import type { OrgSupportTicket } from "@/lib/support/types";

type Props = {
  tickets: OrgSupportTicket[];
  selectedId: string | null;
  now: Date;
  onSelect: (id: string) => void;
};

/** One ticket per row: status dot, subject, category, the last message and when it was written. */
export function TicketList({ tickets, selectedId, now, onSelect }: Props) {
  const { t, locale } = useTranslation();

  return (
    <ul aria-label={t("support.inbox.listAria")} className="divide-y divide-foreground/10">
      {tickets.map((ticket) => {
        const last = lastMessage(ticket);
        const selected = ticket.id === selectedId;
        const needsYou = ticket.status === "waiting";
        return (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => onSelect(ticket.id)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                selected ? "bg-muted/60" : "hover:bg-muted/30",
              )}
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", statusDotClass(TICKET_TONE[ticket.status]))} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn("truncate text-app-sm text-foreground", needsYou ? "font-semibold" : "font-medium")}>{ticket.subject}</span>
                  <time dateTime={ticket.updatedAt} className="shrink-0 text-app-xs text-muted-foreground">
                    {formatRelativeTime(ticket.updatedAt, now, locale)}
                  </time>
                </span>
                <span className="mt-0.5 block truncate text-app-xs text-muted-foreground">
                  {last ? `${last.isFromPlatform ? "" : t("support.inbox.youPrefix")}${previewText(last.body)}` : t("support.inbox.noPreview")}
                </span>
                <span className="mt-1.5 flex items-center gap-2 text-app-xs text-muted-foreground">
                  <span>{t(`support.category.${ticket.category}`)}</span>
                  <span aria-hidden>·</span>
                  <span className={cn(needsYou && "font-semibold text-status-warning-text")}>{t(`support.status.${ticket.status}`)}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
