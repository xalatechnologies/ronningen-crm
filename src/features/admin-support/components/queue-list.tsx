"use client";

import { statusDotClass } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/client";
import { latestNote } from "@/features/admin-support/lib/ticket-queue";
import { formatRelativeTime } from "@/lib/dates/conversation-time";
import type { AdminSupportTicket } from "@/lib/admin/queries/support";
import { supportCategoryLabel, type SupportTicketStatus } from "@/lib/support/labels";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

const TONE: Record<SupportTicketStatus, StatusTone> = { open: "danger", waiting: "warning", resolved: "success" };

function preview(text: string, max = 80): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

type Props = { tickets: AdminSupportTicket[]; selectedId: string | null; now: Date; onSelect: (id: string) => void };

/** One ticket per row: status dot, organization, subject, the latest message and when the ticket last changed. */
export function QueueList({ tickets, selectedId, now, onSelect }: Props) {
  const { t, locale } = useTranslation();
  return (
    <ul aria-label={t("admin.inbox_queue_aria")} className="divide-y divide-foreground/10">
      {tickets.map((ticket) => {
        const last = latestNote(ticket);
        const selected = ticket.id === selectedId;
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
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", statusDotClass(TONE[ticket.status]))} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn("truncate text-app-sm text-foreground", ticket.status === "open" ? "font-semibold" : "font-medium")}>{ticket.organizationName}</span>
                  <time dateTime={ticket.updatedAt} className="shrink-0 text-app-xs text-muted-foreground">
                    {formatRelativeTime(ticket.updatedAt, now, locale)}
                  </time>
                </span>
                <span className="mt-0.5 block truncate text-app-sm text-foreground">{ticket.subject}</span>
                <span className="mt-0.5 block truncate text-app-xs text-muted-foreground">
                  {last ? `${last.isInternal ? `${t("admin.internt_notat")}: ` : ""}${preview(last.body)}` : t("admin.inbox_no_preview")}
                </span>
                <span className="mt-1.5 flex items-center gap-2 text-app-xs text-muted-foreground">
                  <span>{supportCategoryLabel(ticket.category, t)}</span>
                  <span aria-hidden>·</span>
                  <span>{t(`support.status.${ticket.status}`)}</span>
                  {ticket.assignedToName ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="truncate">{t("admin.inbox_assigned_to", { name: ticket.assignedToName })}</span>
                    </>
                  ) : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
