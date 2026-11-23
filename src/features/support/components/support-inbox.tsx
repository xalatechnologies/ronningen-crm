"use client";

import { LifeBuoy, MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Conversation } from "@/features/support/components/conversation";
import { NewTicketDialog } from "@/features/support/components/new-ticket-dialog";
import { TicketList } from "@/features/support/components/ticket-list";
import { TICKET_FILTERS, countTickets, filterTickets, sortTickets, type TicketFilter } from "@/features/support/lib/ticket-view";
import { useTranslation } from "@/i18n/client";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import type { OrgSupportOverview } from "@/lib/support/types";
import { cn } from "@/lib/utils";

type Props = { data: OrgSupportOverview; nowIso: string };

/** Tickets on the left (with filters), the selected conversation on the right; a new ticket opens in a dialog. */
export function SupportInbox({ data, nowIso }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const sorted = useMemo(() => sortTickets(data.tickets), [data.tickets]);
  const counts = useMemo(() => countTickets(data.tickets), [data.tickets]);
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [picked, setPicked] = useState<string | null>(null);
  const [mobileThread, setMobileThread] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const visible = useMemo(() => filterTickets(sorted, filter), [sorted, filter]);
  // The picked ticket stays selected while it is in the list; otherwise the first visible one is shown (desktop).
  const selected = data.tickets.find((ticket) => ticket.id === picked && visible.some((v) => v.id === ticket.id)) ?? visible[0] ?? null;

  function select(id: string) {
    setPicked(id);
    setMobileThread(true);
  }

  if (data.tickets.length === 0) {
    return (
      <>
        <div className={cn(RN_CARD_SHELL, "flex flex-col items-center px-6 py-16 text-center")}>
          <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/10" aria-hidden>
            <LifeBuoy className="size-6" />
          </span>
          <p className="font-medium text-foreground">{t("support.panel.noSupportTickets")}</p>
          <p className="mt-2 max-w-sm text-app-sm text-muted-foreground">{t("support.panel.newTicketDescription")}</p>
          <Button type="button" variant="success" className="mt-5" onClick={() => setNewOpen(true)}>
            <MessageSquarePlus className="size-4" aria-hidden />
            {t("support.panel.newTicket")}
          </Button>
        </div>
        <NewTicketDialog open={newOpen} onOpenChange={setNewOpen} onCreated={() => router.refresh()} />
      </>
    );
  }

  return (
    <>
      <div className={cn(RN_CARD_SHELL, "grid overflow-hidden lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]")}>
        <div className={cn("flex min-h-0 flex-col border-foreground/10 lg:border-r", mobileThread && "hidden lg:flex")}>
          <div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-4 py-3">
            <h2 className="font-heading text-base font-semibold text-foreground">{t("support.inbox.title")}</h2>
            <Button type="button" variant="success" size="sm" onClick={() => setNewOpen(true)}>
              <MessageSquarePlus className="size-4" aria-hidden />
              {t("support.panel.newTicket")}
            </Button>
          </div>
          <div role="group" aria-label={t("support.inbox.filtersAria")} className="flex flex-wrap gap-1.5 border-b border-foreground/10 px-4 py-2.5">
            {TICKET_FILTERS.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={filter === name}
                onClick={() => setFilter(name)}
                className={cn(
                  "rounded-full px-3 py-1 text-app-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  filter === name ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`support.inbox.filters.${name}`)} <span className="tabular-nums opacity-70">{counts[name]}</span>
              </button>
            ))}
          </div>
          <div className="max-h-[36rem] overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="font-medium text-foreground">{t("support.inbox.emptyFilter")}</p>
                <p className="mt-1 text-app-sm text-muted-foreground">{t("support.inbox.emptyFilterHint")}</p>
              </div>
            ) : (
              <TicketList tickets={visible} selectedId={selected?.id ?? null} now={now} onSelect={select} />
            )}
          </div>
        </div>

        <div className={cn("min-w-0", !mobileThread && "hidden lg:block")}>
          {selected ? (
            <Conversation key={selected.id} ticket={selected} now={now} onBack={() => setMobileThread(false)} onUpdated={() => router.refresh()} />
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 py-16 text-center">
              <p className="font-medium text-foreground">{t("support.inbox.selectPrompt")}</p>
              <p className="mt-1 text-app-sm text-muted-foreground">{t("support.inbox.selectPromptHint")}</p>
            </div>
          )}
        </div>
      </div>

      <NewTicketDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => {
          setFilter("all");
          select(id);
          router.refresh();
        }}
      />
    </>
  );
}
