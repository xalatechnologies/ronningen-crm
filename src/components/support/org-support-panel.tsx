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
import { ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORY_OPTIONS = SUPPORT_TICKET_CATEGORIES.map((value) => ({
  value,
  label: SUPPORT_CATEGORY_LABELS[value],
}));

function statusTone(status: OrgSupportTicket["status"]): string {
  if (status === "open") return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (status === "waiting") return "border-rn-border-strong bg-muted/40 text-muted-foreground";
  return "border-rn-border-strong bg-muted/20 text-muted-foreground";
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
    <div className="space-y-4 border-t border-border pt-4">
      {ticket.messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen meldinger ennå.</p>
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
            <Label htmlFor={`reply-${ticket.id}`}>Ditt svar</Label>
            <textarea
              id={`reply-${ticket.id}`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              className="w-full rounded-md border-2 border-rn-border-strong bg-background px-4 py-3 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
              placeholder="Skriv meldingen din…"
            />
          </div>
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={busy || body.trim().length < 3}
          >
            {busy ? "Sender…" : "Send melding"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Saken er lukket. Opprett en ny sak om du trenger mer hjelp.
        </p>
      )}
    </div>
  );
}

export function OrgSupportPanel({ data }: { data: OrgSupportOverview }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [category, setCategory] = useState<SupportTicketCategory>("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

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
    setShowCreate(false);
    setExpandedId(result.ticketId);
    toast.success("Sak opprettet");
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={cn(RN_CARD_SHELL, "p-6 md:p-8")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold">Kontakt plattformsupport</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Opprett en sak når du trenger hjelp med feil, tilgang, fakturering
              eller andre spørsmål om plattformen.
            </p>
          </div>
          <Button
            type="button"
            variant={showCreate ? "outline" : "success"}
            size="cta"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? "Lukk skjema" : "Ny sak"}
          </Button>
        </div>

        {showCreate ? (
          <form
            onSubmit={(event) => void handleCreate(event)}
            className="mt-6 space-y-4 border-t border-border pt-6"
          >
            <div className="space-y-2">
              <Label htmlFor="support-category">Kategori</Label>
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
              <Label htmlFor="support-subject">Emne</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Kort beskrivelse av problemet"
                className="h-12 rounded-md border-2 border-rn-border-strong"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-body">Melding</Label>
              <textarea
                id="support-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                className="w-full rounded-md border-2 border-rn-border-strong bg-background px-4 py-3 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                placeholder="Beskriv hva du trenger hjelp med…"
              />
            </div>
            <Button
              type="submit"
              variant="success"
              size="cta"
              disabled={
                createBusy ||
                subject.trim().length < 3 ||
                body.trim().length < 3
              }
            >
              {createBusy ? "Sender…" : "Send sak"}
            </Button>
          </form>
        ) : null}
      </div>

      <div className={cn(RN_CARD_SHELL, "p-6 md:p-8")}>
        <h2 className="font-heading text-lg font-bold">Dine saker</h2>
        {data.tickets.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Ingen saker ennå. Opprett en sak om du trenger hjelp.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {data.tickets.map((ticket) => {
              const expanded = expandedId === ticket.id;
              return (
                <li key={ticket.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex gap-3">
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
                        <p className="font-semibold">{ticket.subject}</p>
                        <span className="rounded-md border-2 border-rn-border-strong px-2 py-0.5 text-app-xs font-semibold">
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
      </div>
    </div>
  );
}
