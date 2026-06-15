"use client";

import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrgSupportTicket,
  replyToOrgSupportTicket,
} from "@/lib/support/actions";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_DESCRIPTIONS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_CATEGORIES,
  type SupportTicketCategory,
} from "@/lib/support/labels";
import type { OrgSupportOverview, OrgSupportTicket } from "@/lib/support/types";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  MessageSquarePlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const CATEGORY_OPTIONS = SUPPORT_TICKET_CATEGORIES.map((value) => ({
  value,
  label: SUPPORT_CATEGORY_LABELS[value],
}));

const labelClass =
  "text-app-xs font-semibold uppercase tracking-wider text-muted-foreground";
const fieldClass =
  "h-12 rounded-md border-2 border-rn-border-strong bg-background px-4 text-base focus-visible:border-success focus-visible:ring-success/25";
const textareaClass =
  "w-full rounded-md border-2 border-rn-border-strong bg-background px-4 py-3 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

function statusTone(status: OrgSupportTicket["status"]): string {
  if (status === "open")
    return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (status === "waiting")
    return "border-rn-border-strong bg-muted/40 text-muted-foreground";
  return "border-success/35 bg-success/8 text-success dark:!text-white";
}

function TicketThread({
  ticket,
  onUpdated,
}: {
  ticket: OrgSupportTicket;
  onUpdated: () => void;
}) {
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
      toast.error("Kunne ikke sende melding", { description: result.error });
      return;
    }

    setBody("");
    toast.success("Melding sendt");
    onUpdated();
  }

  return (
    <div className="mt-4 space-y-4 border-t border-rn-border-strong/50 pt-4">
      {ticket.messages.length === 0 ? (
        <p className="text-app-sm text-muted-foreground">Ingen meldinger ennå.</p>
      ) : (
        <ul className="space-y-3">
          {ticket.messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "rounded-md border-2 px-4 py-3",
                message.isFromPlatform
                  ? "border-success/30 bg-success/5"
                  : "border-rn-border-strong bg-muted/20",
              )}
            >
              <p className="whitespace-pre-wrap text-app-sm">{message.body}</p>
              <p className="mt-2 text-app-xs text-muted-foreground">
                {message.isFromPlatform
                  ? "Plattformsupport"
                  : (message.authorName ?? "Deg")}{" "}
                ·{" "}
                {format(new Date(message.createdAt), "d. MMM yyyy HH:mm", {
                  locale: nb,
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canReply ? (
        <form onSubmit={(event) => void handleReply(event)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`reply-${ticket.id}`} className={labelClass}>
              Ditt svar
            </Label>
            <textarea
              id={`reply-${ticket.id}`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              className={textareaClass}
              placeholder="Skriv meldingen din…"
            />
          </div>
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={busy || body.trim().length < 3}
            className="w-full sm:w-auto"
          >
            {busy ? "Sender…" : "Send melding"}
          </Button>
        </form>
      ) : (
        <p className="text-app-sm text-muted-foreground">
          Saken er lukket. Opprett en ny sak om du trenger mer hjelp.
        </p>
      )}
    </div>
  );
}

export function OrgSupportPanel({ data }: { data: OrgSupportOverview }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(
    data.tickets[0]?.id ?? null,
  );
  const [category, setCategory] = useState<SupportTicketCategory>("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const waitingCount = useMemo(
    () => data.tickets.filter((t) => t.status === "waiting").length,
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
      toast.error("Kunne ikke opprette sak", { description: result.error });
      return;
    }

    setSubject("");
    setBody("");
    setCategory("other");
    setExpandedId(result.ticketId);
    toast.success("Sak opprettet");
    refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] lg:items-start">
      <section className={cn(RN_CARD_SHELL, "flex flex-col p-5 md:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rn-border-strong/50 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rn-border-strong/70 bg-muted/30 text-muted-foreground">
              <Inbox className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
                Dine saker
              </h2>
              <p className="mt-1 text-app-sm text-muted-foreground">
                {data.tickets.length === 0
                  ? "Ingen saker ennå."
                  : `${data.openCount} åpen${data.openCount === 1 ? "" : "e"} · ${waitingCount} venter på deg`}
              </p>
            </div>
          </div>
        </div>

        {data.tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <p className="font-medium text-foreground">Ingen support-saker</p>
            <p className="mt-2 max-w-sm text-app-sm text-muted-foreground">
              Opprett en sak til høyre når du trenger hjelp med feil, tilgang,
              fakturering eller andre spørsmål.
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
                    "rounded-md border-2 transition-colors",
                    expanded
                      ? "border-rn-accent-border/60 bg-rn-surface-gradient-from/30"
                      : "border-rn-border-strong/70 bg-background hover:border-rn-border-strong",
                  )}
                >
                  <div className="flex gap-3 p-4">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expanded ? null : ticket.id)
                      }
                      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border-2 border-rn-border-strong text-muted-foreground transition-colors hover:bg-muted/40"
                      aria-expanded={expanded}
                      aria-label={expanded ? "Skjul samtale" : "Vis samtale"}
                    >
                      {expanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {ticket.subject}
                        </p>
                        <span className="rounded-md border-2 border-rn-border-strong px-2 py-0.5 text-app-xs font-semibold text-muted-foreground">
                          {SUPPORT_CATEGORY_LABELS[ticket.category]}
                        </span>
                        <span
                          className={cn(
                            "rounded-md border-2 px-2 py-0.5 text-app-xs font-semibold",
                            statusTone(ticket.status),
                          )}
                        >
                          {SUPPORT_STATUS_LABELS[ticket.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-app-xs text-muted-foreground">
                        {SUPPORT_STATUS_DESCRIPTIONS[ticket.status]} · Oppdatert{" "}
                        {format(new Date(ticket.updatedAt), "d. MMM yyyy HH:mm", {
                          locale: nb,
                        })}
                      </p>
                      {expanded ? (
                        <TicketThread ticket={ticket} onUpdated={refresh} />
                      ) : null}
                    </div>
                  </div>
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
        <div className="flex items-start gap-3 border-b border-rn-border-strong/50 pb-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rn-border-strong/70 bg-muted/30 text-muted-foreground">
            <MessageSquarePlus className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
              Ny sak
            </h2>
            <p className="mt-1 text-app-sm text-muted-foreground">
              Vi svarer så raskt vi kan på hverdager.
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => void handleCreate(event)}
          className="flex flex-col gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="support-category" className={labelClass}>
              Kategori
            </Label>
            <FormSelect
              id="support-category"
              value={category}
              onValueChange={(value) =>
                setCategory(value as SupportTicketCategory)
              }
              options={CATEGORY_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-subject" className={labelClass}>
              Emne
            </Label>
            <Input
              id="support-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Kort beskrivelse"
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-body" className={labelClass}>
              Melding
            </Label>
            <textarea
              id="support-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              className={textareaClass}
              placeholder="Beskriv hva du trenger hjelp med…"
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
            {createBusy ? "Sender…" : "Send sak"}
          </Button>
        </form>
      </aside>
    </div>
  );
}
