"use client";

import { useTranslation } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrgSupportTicket,
  replyToOrgSupportTicket,
} from "@/lib/support/actions";
import {
  SUPPORT_TICKET_CATEGORIES,
  type SupportTicketCategory,
} from "@/lib/support/labels";
import type { OrgSupportOverview, OrgSupportTicket } from "@/lib/support/types";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import { nb } from "date-fns/locale/nb";
import {
  ChevronDown,
  Inbox,
  LifeBuoy,
  MessageSquarePlus,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const labelClass =
  "text-app-xs font-semibold text-muted-foreground";
const fieldClass =
  "h-11 rounded-xl border border-foreground/25 bg-background px-4 text-base hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 aria-invalid:border-destructive";
const textareaClass =
  "w-full resize-y rounded-xl border border-foreground/25 bg-background px-4 py-3 text-app-base outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20";

function statusTone(status: OrgSupportTicket["status"]): string {
  if (status === "open")
    return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (status === "waiting")
    return "border-foreground/15 bg-muted/50 text-muted-foreground";
  return "border-success/35 bg-success/8 text-success dark:!text-white";
}

function TicketThread({
  ticket,
  onUpdated,
}: {
  ticket: OrgSupportTicket;
  onUpdated: () => void;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "nb" ? nb : enGB;
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const canReply = ticket.status === "open" || ticket.status === "waiting";

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!canReply || body.trim().length < 3) return;

    setBusy(true);
    const result = await replyToOrgSupportTicket({
      ticketId: ticket.id,
      body,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error(t("support.panel.sendFailed"), { description: result.error });
      return;
    }

    setBody("");
    toast.success(t("support.panel.messageSent"));
    onUpdated();
  }

  return (
    <div className="space-y-5 border-t border-foreground/10 bg-muted/30 px-4 py-5 md:px-5">
      {ticket.messages.length === 0 ? (
        <p className="text-app-sm text-muted-foreground">
          {t("support.panel.noMessages")}
        </p>
      ) : (
        <ul className="space-y-4">
          {ticket.messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "flex gap-3",
                message.isFromPlatform ? "justify-start" : "flex-row-reverse",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                  message.isFromPlatform
                    ? "bg-success text-white"
                    : "bg-muted text-muted-foreground ring-1 ring-foreground/10",
                )}
                aria-hidden
              >
                {message.isFromPlatform ? (
                  <LifeBuoy className="size-4" />
                ) : (
                  <span className="text-app-xs font-bold">
                    {(message.authorName ?? t("support.panel.you")).slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <div
                className={cn(
                  "flex min-w-0 max-w-[85%] flex-col gap-1",
                  message.isFromPlatform ? "items-start" : "items-end",
                )}
              >
                <p
                  className={cn(
                    "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-app-sm leading-relaxed",
                    message.isFromPlatform
                      ? "rounded-tl-md bg-card text-foreground ring-1 ring-foreground/10"
                      : "rounded-tr-md bg-success/12 text-foreground ring-1 ring-success/20",
                  )}
                >
                  {message.body}
                </p>
                <p className="px-1 text-app-xs text-muted-foreground">
                  {message.isFromPlatform
                    ? t("support.panel.platformSupport")
                    : (message.authorName ?? t("support.panel.you"))}{" "}
                  ·{" "}
                  {format(new Date(message.createdAt), "d. MMM yyyy HH:mm", {
                    locale: dateLocale,
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canReply ? (
        <form onSubmit={(event) => void handleReply(event)} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="space-y-2">
            <Label htmlFor={`reply-${ticket.id}`} className={labelClass}>
              {t("support.panel.yourReply")}
            </Label>
            <textarea
              id={`reply-${ticket.id}`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              className={textareaClass}
              placeholder={t("support.panel.replyPlaceholder")}
            />
          </div>
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={busy || body.trim().length < 3}
            className="w-full sm:w-auto"
          >
            <Send aria-hidden />
            {busy ? t("support.panel.sending") : t("support.panel.sendMessage")}
          </Button>
        </form>
      ) : (
        <p className="rounded-xl bg-card px-4 py-3 text-app-sm text-muted-foreground ring-1 ring-foreground/10">
          {t("support.panel.closedHint")}
        </p>
      )}
    </div>
  );
}

export function OrgSupportPanel({ data }: { data: OrgSupportOverview }) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "nb" ? nb : enGB;
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(
    data.tickets[0]?.id ?? null,
  );
  const [category, setCategory] = useState<SupportTicketCategory>("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const categoryOptions = useMemo(
    () =>
      SUPPORT_TICKET_CATEGORIES.map((value) => ({
        value,
        label: t(`support.category.${value}`),
      })),
    [t],
  );

  const waitingCount = useMemo(
    () => data.tickets.filter((ticket) => ticket.status === "waiting").length,
    [data.tickets],
  );

  function refresh() {
    router.refresh();
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (subject.trim().length < 3 || body.trim().length < 3) return;

    setCreateBusy(true);
    const result = await createOrgSupportTicket({ subject, body, category });
    setCreateBusy(false);

    if (!result.ok) {
      toast.error(t("support.panel.createFailed"), { description: result.error });
      return;
    }

    setSubject("");
    setBody("");
    setCategory("other");
    setExpandedId(result.ticketId);
    toast.success(t("support.panel.ticketCreated"));
    refresh();
  }

  const ticketSummary =
    data.tickets.length === 0
      ? t("support.panel.noTickets")
      : data.openCount === 1
        ? t("support.panel.ticketSummary", {
            open: data.openCount,
            waiting: waitingCount,
          })
        : t("support.panel.ticketSummaryPlural", {
            open: data.openCount,
            waiting: waitingCount,
          });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] lg:items-start">
      <section className={cn(RN_CARD_SHELL, "flex flex-col p-5 md:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-foreground/10 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success ring-1 ring-success/20 dark:!text-white">
              <Inbox className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
                {t("support.panel.yourTickets")}
              </h2>
              <p className="mt-1 text-app-sm text-muted-foreground">
                {ticketSummary}
              </p>
            </div>
          </div>
          {data.tickets.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-app-xs font-semibold", statusTone("open"))}>
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {t("support.status.open")} · {data.openCount}
              </span>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-app-xs font-semibold", statusTone("waiting"))}>
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {t("support.status.waiting")} · {waitingCount}
              </span>
            </div>
          ) : null}
        </div>

        {data.tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/10" aria-hidden>
              <LifeBuoy className="size-6" />
            </span>
            <p className="font-medium text-foreground">
              {t("support.panel.noSupportTickets")}
            </p>
            <p className="mt-2 max-w-sm text-app-sm text-muted-foreground">
              {t("support.panel.emptyHint")}
            </p>
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {data.tickets.map((ticket) => {
              const expanded = expandedId === ticket.id;
              return (
                <li
                  key={ticket.id}
                  className={cn(
                    "overflow-hidden rounded-2xl bg-card ring-1 transition-shadow",
                    expanded
                      ? "ring-success/40 shadow-sm"
                      : "ring-foreground/12 hover:ring-foreground/30",
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expanded ? null : ticket.id)
                    }
                    className="flex w-full items-start gap-3 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-inset"
                    aria-expanded={expanded}
                    title={
                      expanded
                        ? t("support.panel.hideThread")
                        : t("support.panel.showThread")
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {ticket.subject}
                        </p>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-app-xs font-semibold text-muted-foreground">
                          {t(`support.category.${ticket.category}`)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-app-xs font-semibold",
                            statusTone(ticket.status),
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" aria-hidden />
                          {t(`support.status.${ticket.status}`)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-app-xs text-muted-foreground">
                        {t(`support.statusDescription.${ticket.status}`)} ·{" "}
                        {t("support.panel.updated")}{" "}
                        {format(new Date(ticket.updatedAt), "d. MMM yyyy HH:mm", {
                          locale: dateLocale,
                        })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform",
                        expanded && "rotate-180",
                      )}
                      aria-hidden
                    >
                      <ChevronDown className="size-4" />
                    </span>
                  </button>
                  {expanded ? (
                    <TicketThread ticket={ticket} onUpdated={refresh} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside
        className={cn(
          RN_CARD_SHELL,
          "flex flex-col gap-6 p-5 md:p-6 lg:sticky lg:top-6",
        )}
      >
        <div className="flex items-start gap-3 border-b border-foreground/10 pb-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success ring-1 ring-success/20 dark:!text-white">
            <MessageSquarePlus className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
              {t("support.panel.newTicket")}
            </h2>
            <p className="mt-1 text-app-sm text-muted-foreground">
              {t("support.panel.newTicketDescription")}
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => void handleCreate(event)}
          className="flex flex-col gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="support-category" className={labelClass}>
              {t("common.category")}
            </Label>
            <FormSelect
              id="support-category"
              value={category}
              onValueChange={(value) =>
                setCategory(value as SupportTicketCategory)
              }
              options={categoryOptions}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-subject" className={labelClass}>
              {t("support.panel.subject")}
            </Label>
            <Input
              id="support-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={t("support.panel.subjectPlaceholder")}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-body" className={labelClass}>
              {t("support.panel.message")}
            </Label>
            <textarea
              id="support-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              className={textareaClass}
              placeholder={t("support.panel.messagePlaceholder")}
            />
          </div>
          <Button
            type="submit"
            variant="success"
            size="cta"
            className="w-full"
            disabled={
              createBusy ||
              subject.trim().length < 3 ||
              body.trim().length < 3
            }
          >
            <Send aria-hidden />
            {createBusy ? t("support.panel.sending") : t("support.panel.sendTicket")}
          </Button>
        </form>
      </aside>
    </div>
  );
}
