"use client";

import { ArrowLeft, LifeBuoy, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TicketStatusBadge } from "@/features/support/components/ticket-status";
import { BODY_MAX, validateTicketText } from "@/features/support/lib/ticket-input";
import { formatRelativeTime, groupByDay } from "@/lib/dates/conversation-time";
import { useTranslation } from "@/i18n/client";
import { replyToOrgSupportTicket } from "@/lib/support/actions";
import type { OrgSupportTicket } from "@/lib/support/types";
import { cn } from "@/lib/utils";

type Props = { ticket: OrgSupportTicket; now: Date; onBack: () => void; onUpdated: () => void };

/** The conversation of one ticket: header, messages with day dividers, and a reply box while the ticket is open. */
export function Conversation({ ticket, now, onBack, onUpdated }: Props) {
  const { t, locale } = useTranslation();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const canReply = ticket.status !== "resolved";
  const days = groupByDay(ticket.messages, now);
  const invalid = validateTicketText({ body }) !== null;
  const messageCount = ticket.messages.length;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [ticket.id, messageCount]);

  async function send() {
    if (!canReply || invalid || busy) return;
    setBusy(true);
    try {
      const result = await replyToOrgSupportTicket({ ticketId: ticket.id, body });
      if (!result.ok) {
        toast.error(t("support.panel.sendFailed"), { description: result.error });
        return;
      }
      setBody("");
      toast.success(t("support.panel.messageSent"));
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={t("support.inbox.conversationAria", { subject: ticket.subject })} className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-2 border-b border-foreground/10 px-5 py-4">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit lg:hidden" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          {t("support.inbox.back")}
        </Button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="font-heading text-lg font-semibold text-foreground">{ticket.subject}</h2>
          <TicketStatusBadge status={ticket.status} />
        </div>
        <p className="text-app-xs text-muted-foreground">
          {t(`support.category.${ticket.category}`)} · {t("support.inbox.opened", { when: formatRelativeTime(ticket.createdAt, now, locale) })}
        </p>
        <p className="text-app-sm text-muted-foreground">{t(`support.statusDescription.${ticket.status}`)}</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {days.length === 0 ? <p className="text-app-sm text-muted-foreground">{t("support.panel.noMessages")}</p> : null}
        {days.map((day) => (
          <div key={day.dayKey} className="flex flex-col gap-4">
            <p className="flex items-center gap-3 text-app-xs font-medium text-muted-foreground before:h-px before:flex-1 before:bg-foreground/10 after:h-px after:flex-1 after:bg-foreground/10">
              {day.label === "date"
                ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Oslo" }).format(new Date(day.isoOfFirst))
                : t(day.label === "today" ? "support.inbox.today" : "support.inbox.yesterday")}
            </p>
            {day.items.map((message) => {
              const mine = !message.isFromPlatform;
              const author = message.isFromPlatform ? t("support.panel.platformSupport") : (message.authorName ?? t("support.panel.you"));
              return (
                <div key={message.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-app-xs font-bold",
                      mine ? "bg-muted text-muted-foreground ring-1 ring-foreground/10" : "bg-success text-white",
                    )}
                  >
                    {mine ? author.slice(0, 1).toUpperCase() : <LifeBuoy className="size-4" />}
                  </span>
                  <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1", mine ? "items-end" : "items-start")}>
                    <p
                      className={cn(
                        "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-app-sm leading-relaxed text-foreground",
                        mine ? "rounded-tr-md bg-success/12 ring-1 ring-success/20" : "rounded-tl-md bg-card ring-1 ring-foreground/10",
                      )}
                    >
                      {message.body}
                    </p>
                    <p className="px-1 text-app-xs text-muted-foreground">
                      {author} ·{" "}
                      <time dateTime={message.createdAt} title={new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Oslo" }).format(new Date(message.createdAt))}>
                        {formatRelativeTime(message.createdAt, now, locale)}
                      </time>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {canReply ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="flex shrink-0 flex-col gap-2 border-t border-foreground/10 px-5 py-4"
        >
          <Label htmlFor={`reply-${ticket.id}`} className="sr-only">
            {t("support.panel.yourReply")}
          </Label>
          <textarea
            id={`reply-${ticket.id}`}
            value={body}
            rows={3}
            maxLength={BODY_MAX}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder={t("support.panel.replyPlaceholder")}
            className="w-full resize-y rounded-xl border border-foreground/25 bg-background px-4 py-3 text-app-base outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-app-xs text-muted-foreground">{t("support.inbox.sendHint")}</p>
            <Button type="submit" variant="success" disabled={busy || invalid}>
              <Send className="size-4" aria-hidden />
              {busy ? t("support.panel.sending") : t("support.panel.sendMessage")}
            </Button>
          </div>
        </form>
      ) : (
        <p className="shrink-0 border-t border-foreground/10 px-5 py-4 text-app-sm text-muted-foreground">{t("support.panel.closedHint")}</p>
      )}
    </section>
  );
}
