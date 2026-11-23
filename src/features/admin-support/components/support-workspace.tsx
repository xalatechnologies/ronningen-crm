"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";
import { NewTicketDialog } from "@/features/admin-support/components/new-ticket-dialog";
import { QueueList } from "@/features/admin-support/components/queue-list";
import { TicketDetail } from "@/features/admin-support/components/ticket-detail";
import { SUPPORT_FILTERS, buildSupportQuery, countByStatus, matchesTicket, parseSupportFilter, sortQueue } from "@/features/admin-support/lib/ticket-queue";
import { adminRoutes } from "@/config/admin-routes";
import { useTranslation } from "@/i18n/client";
import type { AdminSupportOverview } from "@/lib/admin/queries/support";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = { data: AdminSupportOverview; nowIso: string };

/** The operator's support inbox: the queue with filters and search on the left, the selected ticket on the right. */
export function SupportWorkspace({ data, nowIso }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const filter = parseSupportFilter(searchParams.get("filter"));
  const search = searchParams.get("q") ?? "";
  const picked = searchParams.get("sak");
  const [mobileThread, setMobileThread] = useState(Boolean(picked));
  const [newOpen, setNewOpen] = useState(false);

  const sorted = useMemo(() => sortQueue(data.tickets), [data.tickets]);
  const counts = useMemo(() => countByStatus(data.tickets), [data.tickets]);
  const visible = useMemo(() => sorted.filter((ticket) => matchesTicket(ticket, filter, search)), [sorted, filter, search]);
  const selected = visible.find((ticket) => ticket.id === picked) ?? visible[0] ?? null;

  function go(next: { filter?: typeof filter; q?: string; ticket?: string | null }) {
    const query = buildSupportQuery({ filter: next.filter ?? filter, q: next.q ?? search, ticket: next.ticket === undefined ? picked : next.ticket });
    router.replace(query ? `${adminRoutes.support}?${query}` : adminRoutes.support, { scroll: false });
  }

  return (
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 max-w-full flex-col gap-6 pb-8">
      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="px-5 py-5 sm:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title={t("admin.support")}
            description={t("admin.support_saker_og_intern_oppfolging_per_organisasjon")}
            actions={
              <Button type="button" variant="success" onClick={() => setNewOpen(true)}>
                {t("admin.opprett_sak")}
              </Button>
            }
          />
        </div>
      </div>

      <div className={cn(RN_CARD_SHELL, "grid h-[calc(100dvh-16rem)] min-h-[34rem] overflow-hidden lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]")}>
        <div className={cn("flex min-h-0 flex-col border-foreground/10 lg:border-r", mobileThread && "hidden lg:flex")}>
          <div className="flex flex-col gap-3 border-b border-foreground/10 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => go({ q: event.target.value })}
                placeholder={t("admin.inbox_search_placeholder")}
                aria-label={t("admin.sok_support_saker")}
                className="h-10 w-full rounded-xl border border-foreground/25 bg-background pr-3 pl-9 text-app-sm outline-none placeholder:text-muted-foreground focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
              />
            </div>
            <div role="group" aria-label={t("admin.filtrer_support_saker")} className="flex flex-wrap gap-1.5">
              {SUPPORT_FILTERS.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={filter === name}
                  onClick={() => go({ filter: name })}
                  className={cn(
                    "rounded-full px-3 py-1 text-app-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    filter === name ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {name === "all" ? t("admin.alle") : t(`support.status.${name}`)} <span className="tabular-nums opacity-70">{counts[name]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="font-medium text-foreground">{data.tickets.length === 0 ? t("admin.inbox_empty_all") : t("admin.inbox_empty_filter")}</p>
                {data.tickets.length > 0 ? <p className="mt-1 text-app-sm text-muted-foreground">{t("admin.inbox_empty_filter_hint")}</p> : null}
              </div>
            ) : (
              <QueueList
                tickets={visible}
                selectedId={selected?.id ?? null}
                now={now}
                onSelect={(id) => {
                  go({ ticket: id });
                  setMobileThread(true);
                }}
              />
            )}
          </div>
        </div>

        <div className={cn("min-h-0 min-w-0", !mobileThread && "hidden lg:block")}>
          {selected ? (
            <TicketDetail key={selected.id} ticket={selected} now={now} onBack={() => setMobileThread(false)} onUpdated={() => router.refresh()} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <p className="font-medium text-foreground">{t("admin.inbox_select_prompt")}</p>
              <p className="mt-1 text-app-sm text-muted-foreground">{t("admin.inbox_select_prompt_hint")}</p>
            </div>
          )}
        </div>
      </div>

      <NewTicketDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        orgOptions={data.orgOptions}
        onCreated={(id) => {
          go({ filter: "all", q: "", ticket: id });
          setMobileThread(true);
          router.refresh();
        }}
      />
    </div>
  );
}
