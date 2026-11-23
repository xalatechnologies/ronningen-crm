"use client";

import { ArrowLeft, LifeBuoy, Lock, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import { adminRoutes } from "@/config/admin-routes";
import { BODY_MAX, validateTicketText } from "@/features/support/lib/ticket-input";
import { useTranslation } from "@/i18n/client";
import { addSupportNote, updateSupportTicketStatus } from "@/lib/admin/actions/support";
import type { AdminSupportNote, AdminSupportTicket } from "@/lib/admin/queries/support";
import { SUPPORT_SETTABLE_STATUSES, supportStatusLabel, type SupportTicketStatus } from "@/lib/admin/support-labels";
import { formatRelativeTime, groupByDay } from "@/lib/dates/conversation-time";
import { supportCategoryLabel } from "@/lib/support/labels";
import { cn } from "@/lib/utils";

type Mode = "reply" | "note";
type Props = { ticket: AdminSupportTicket; now: Date; onBack: () => void; onUpdated: () => void };

function authorOf(note: AdminSupportNote, t: ReturnType<typeof useTranslation>["t"]): string {
  if (note.authorIsPlatformAdmin) return note.authorName ?? t("admin.inbox_you");
  return note.authorName ?? t("admin.kunde");
}

/** One ticket for the operator: who and what, the status, the conversation with internal notes marked, and the reply box. */
export function TicketDetail({ ticket, now, onBack, onUpdated }: Props) {
  const { t, locale } = useTranslation();
  const [mode, setMode] = useState<Mode>("reply");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const days = groupByDay(ticket.notes.map((n) => ({ ...n, createdAt: n.createdAt })), now);
  const invalid = validateTicketText({ body }) !== null;
  const noteCount = ticket.notes.length;
  const statusOptions = useMemo(() => SUPPORT_SETTABLE_STATUSES.map((value) => ({ value, label: supportStatusLabel(value, t) })), [t]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [ticket.id, noteCount]);

  async function send() {
    if (invalid || busy) return;
    setBusy(true);
    try {
      const result = await addSupportNote({ ticketId: ticket.id, body, isInternal: mode === "note" });
      if (!result.ok) {
        toast.error(t("admin.kunne_ikke_lagre_notat"), { description: result.error });
        return;
      }
      setBody("");
      toast.success(mode === "note" ? t("admin.internt_notat_lagt_til") : t("admin.svar_sendt_til_kunde"));
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: string) {
    if (!next || next === ticket.status) return;
    setStatusBusy(true);
    try {
      const result = await updateSupportTicketStatus({ ticketId: ticket.id, status: next as SupportTicketStatus });
      if (!result.ok) {
        toast.error(t("admin.kunne_ikke_oppdatere_status"), { description: result.error });
        return;
      }
      toast.success(t("admin.status_oppdatert"));
      onUpdated();
    } finally {
      setStatusBusy(false);
    }
  }

  const source = ticket.ticketSource === "tenant" ? t("admin.inbox_from_customer") : ticket.ticketSource === "admin" ? t("admin.inbox_from_admin") : null;

  return (
    <section aria-label={ticket.subject} className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-3 border-b border-foreground/10 px-5 py-4">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit lg:hidden" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          {t("admin.inbox_back")}
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground">{ticket.subject}</h2>
            <p className="mt-1 text-app-sm text-muted-foreground">
              <Link href={adminRoutes.organizationDetail(ticket.organizationId)} className="font-semibold text-foreground underline-offset-4 hover:underline">
                {ticket.organizationName}
              </Link>{" "}
              · {supportCategoryLabel(ticket.category, t)}
              {source ? ` · ${source}` : ""}
              {ticket.createdByName ? ` · ${ticket.createdByName}` : ""}
            </p>
            <p className="mt-0.5 text-app-xs text-muted-foreground">
              {t("admin.inbox_opened", { when: formatRelativeTime(ticket.createdAt, now, locale) })}
              {ticket.assignedToName ? ` · ${t("admin.inbox_assigned_to", { name: ticket.assignedToName })}` : ""}
              {` · ${t("admin.inbox_messages_count", { count: noteCount })}`}
            </p>
          </div>
          <div className="w-44 shrink-0">
            <FormSelect
              value={ticket.status}
              onValueChange={(value) => void changeStatus(value)}
              options={statusOptions}
              disabled={statusBusy}
              aria-label={t("admin.inbox_status_for", { subject: ticket.subject })}
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {days.length === 0 ? <p className="text-app-sm text-muted-foreground">{t("adminLabels.empty.noMessages")}</p> : null}
        {days.map((day) => (
          <div key={day.dayKey} className="flex flex-col gap-4">
            <p className="flex items-center gap-3 text-app-xs font-medium text-muted-foreground before:h-px before:flex-1 before:bg-foreground/10 after:h-px after:flex-1 after:bg-foreground/10">
              {day.label === "date"
                ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Oslo" }).format(new Date(day.isoOfFirst))
                : t(day.label === "today" ? "admin.inbox_today" : "admin.inbox_yesterday")}
            </p>
            {day.items.map((note) => {
              const author = authorOf(note, t);
              const when = formatRelativeTime(note.createdAt, now, locale);
              const exact = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Oslo" }).format(new Date(note.createdAt));
              if (note.isInternal) {
                return (
                  <div key={note.id} className="rounded-xl border border-dashed border-status-warning-border bg-status-warning-bg px-4 py-3 text-status-warning-text">
                    <p className="flex items-center gap-1.5 text-app-xs font-semibold">
                      <Lock className="size-3.5" aria-hidden />
                      {t("admin.internt_notat")} · {author}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-app-sm leading-relaxed text-foreground">{note.body}</p>
                    <time dateTime={note.createdAt} title={exact} className="mt-1.5 block text-app-xs opacity-80">{when}</time>
                  </div>
                );
              }
              const platform = note.authorIsPlatformAdmin;
              return (
                <div key={note.id} className={cn("flex gap-3", platform && "flex-row-reverse")}>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-app-xs font-bold",
                      platform ? "bg-success text-white" : "bg-muted text-muted-foreground ring-1 ring-foreground/10",
                    )}
                  >
                    {platform ? <LifeBuoy className="size-4" /> : author.slice(0, 1).toUpperCase()}
                  </span>
                  <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1", platform ? "items-end" : "items-start")}>
                    <p
                      className={cn(
                        "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-app-sm leading-relaxed text-foreground",
                        platform ? "rounded-tr-md bg-success/12 ring-1 ring-success/20" : "rounded-tl-md bg-card ring-1 ring-foreground/10",
                      )}
                    >
                      {note.body}
                    </p>
                    <p className="px-1 text-app-xs text-muted-foreground">
                      {author} · <time dateTime={note.createdAt} title={exact}>{when}</time>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className={cn("flex shrink-0 flex-col gap-3 border-t px-5 py-4", mode === "note" ? "border-status-warning-border bg-status-warning-bg/40" : "border-foreground/10")}
      >
        <div role="tablist" aria-label={t("admin.inbox_modes_aria")} className="inline-flex w-fit rounded-xl bg-muted/50 p-1 ring-1 ring-foreground/10">
          {(["reply", "note"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-app-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                mode === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value === "reply" ? t("admin.svar_til_kunde") : t("admin.internt_notat")}
            </button>
          ))}
        </div>
        <Label htmlFor={`note-${ticket.id}`} className="sr-only">
          {mode === "reply" ? t("admin.svar_til_kunde") : t("admin.internt_notat")}
        </Label>
        <textarea
          id={`note-${ticket.id}`}
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
          placeholder={mode === "reply" ? t("admin.svar_som_kunden_kan_lese") : t("admin.intern_oppfolging_ikke_synlig_for_kunden")}
          className="w-full resize-y rounded-xl border border-foreground/25 bg-background px-4 py-3 text-app-base outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-app-xs text-muted-foreground">
            {mode === "reply" ? t("admin.inbox_reply_hint") : t("admin.inbox_note_hint")} · {t("admin.inbox_send_hint")}
          </p>
          <Button type="submit" variant="success" disabled={busy || invalid}>
            <Send className="size-4" aria-hidden />
            {busy ? t("admin.lagrer") : mode === "reply" ? t("admin.send_svar") : t("admin.legg_til_internt_notat")}
          </Button>
        </div>
      </form>
    </section>
  );
}
