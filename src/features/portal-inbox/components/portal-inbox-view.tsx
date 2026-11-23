"use client";

import { CalendarDays, CheckCircle2, ChevronRight, Clock, Inbox, ListChecks, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { ListPagination } from "@/components/ui/list-pagination";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { countdownKind, daysUntil, inboxSummary, searchInbox } from "@/features/portal-inbox/lib/inbox-view";
import { useTranslation } from "@/i18n/client";
import type { Translator, TranslationKey } from "@/i18n/types";
import { TENANT_LIST_PAGE_SIZE } from "@/lib/list-pagination";
import { filterInbox, INBOX_FILTERS, inboxCounts, type InboxFilter, type InboxRow } from "@/lib/portal/inbox-rules";
import { usePagedList } from "@/lib/use-paged-list";
import { usePageSearch } from "@/providers/page-search-provider";
import { cn } from "@/lib/utils";

const FILTER_LABEL: Record<InboxFilter, TranslationKey> = {
  attention: "portal.inbox.filterAttention",
  active: "portal.inbox.filterActive",
  invited: "portal.inbox.filterInvited",
  all: "portal.inbox.filterAll",
};

const STATE_TONE: Record<InboxRow["state"], StatusTone> = { active: "success", invited: "info", expired: "warning" };
const STATE_LABEL: Record<InboxRow["state"], TranslationKey> = {
  active: "portal.inbox.stateActive",
  invited: "portal.inbox.stateInvited",
  expired: "portal.inbox.stateExpired",
};

const rowHref = (row: InboxRow) => `/app/bookings/${row.bookingId}/portal${row.tab === "messages" ? "" : `?tab=${row.tab}`}`;

function countdownText(t: Translator, days: number): string {
  const c = countdownKind(days);
  if (c.kind === "today") return t("portal.inbox.countdownToday");
  if (c.kind === "tomorrow") return t("portal.inbox.countdownTomorrow");
  return c.kind === "future" ? t("portal.inbox.countdownFuture", { count: c.days }) : t("portal.inbox.countdownPast", { count: c.days });
}

/** Chips for what waits for the venue's reply: messages, wishes and a shared day plan. */
function WaitingChips({ row, t }: { row: InboxRow; t: Translator }) {
  const chips = [
    row.unread > 0 ? { Icon: MessageCircle, label: t("portal.staffPage.unread", { count: row.unread }) } : null,
    row.wishesWaiting > 0 ? { Icon: ListChecks, label: t("portal.staffWishes.pending", { count: row.wishesWaiting }) } : null,
    row.planWaiting ? { Icon: Send, label: t("portal.staffSchedule.pendingBadge") } : null,
  ].filter((chip): chip is NonNullable<typeof chip> => chip !== null);
  if (chips.length === 0) return <span className="text-app-sm text-muted-foreground">{t("portal.inbox.waitingNone")}</span>;
  return (
    <span className="flex flex-wrap gap-1.5 md:justify-end">
      {chips.map(({ Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-app-xs font-semibold text-white">
          <Icon className="size-3.5" aria-hidden />
          {label}
        </span>
      ))}
    </span>
  );
}

/** The staff Kundeportal page: summary cards, filter, search, and the customers as a table. */
export function PortalInboxView({ rows, initialFilter, today }: { rows: InboxRow[]; initialFilter: InboxFilter; today: string }) {
  const { t, formatDate } = useTranslation();
  const router = useRouter();
  const { query } = usePageSearch();
  const [filter, setFilter] = useState<InboxFilter>(initialFilter);

  const counts = useMemo(() => inboxCounts(rows), [rows]);
  const summary = useMemo(() => inboxSummary(rows, today), [rows, today]);
  const visible = useMemo(() => searchInbox(filterInbox(rows, filter), query), [rows, filter, query]);
  const { page, totalPages, pageItems, goToPage } = usePagedList(visible, TENANT_LIST_PAGE_SIZE, `${filter}|${query}`);

  function changeFilter(next: InboxFilter) {
    setFilter(next);
    // Keep the address in sync (links and the back button) without asking the server for the list again.
    window.history.replaceState(null, "", next === "attention" ? "/app/portal" : `/app/portal?filter=${next}`);
  }

  const columns = useMemo<DataTableColumn<InboxRow>[]>(
    () => [
      {
        id: "customer",
        header: t("portal.inbox.colCustomer"),
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-3">
            <InitialsAvatar name={row.customerName} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-rn-text-heading">{row.customerName}</span>
              <span className="truncate text-app-sm text-muted-foreground">{row.reference}</span>
            </span>
          </span>
        ),
      },
      {
        id: "event",
        header: t("portal.inbox.colEvent"),
        cell: (row) => {
          const days = row.eventDate ? daysUntil(row.eventDate, today) : null;
          return (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-app-sm font-semibold">{row.eventDate ? formatDate(row.eventDate) : t("portal.inbox.noDate")}</span>
              <span className="truncate text-app-sm text-muted-foreground">
                {[row.eventType, days != null ? countdownText(t, days) : null].filter(Boolean).join(" · ")}
              </span>
            </span>
          );
        },
      },
      {
        id: "portal",
        header: t("portal.inbox.colPortal"),
        cell: (row) => <StatusBadge tone={STATE_TONE[row.state]}>{t(STATE_LABEL[row.state])}</StatusBadge>,
      },
      { id: "waiting", header: t("portal.inbox.colWaiting"), align: "right", cell: (row) => <WaitingChips row={row} t={t} /> },
      {
        id: "open",
        header: t("portal.inbox.title"),
        srOnlyHeader: true,
        align: "right",
        className: "w-10",
        cell: () => <ChevronRight className="ml-auto size-5 text-muted-foreground" aria-hidden />,
      },
    ],
    [t, formatDate, today],
  );

  const nextEvent = summary.next;
  const emptyAttention = filter === "attention" && rows.length > 0 && !query.trim();

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label={t("portal.inbox.title")}>
        <StatCard
          variant="brand"
          icon={Inbox}
          label={t("portal.inbox.statWaiting")}
          value={summary.waitingCustomers}
          caption={t("portal.inbox.statWaitingHint", { count: summary.waitingItems })}
        />
        <StatCard icon={CheckCircle2} label={t("portal.inbox.statActive")} value={summary.active} caption={t("portal.inbox.statActiveHint")} />
        <StatCard
          icon={Clock}
          label={t("portal.inbox.statFollowUp")}
          value={summary.followUp}
          valueClassName={summary.followUp > 0 ? "text-status-warning-text" : undefined}
          caption={t("portal.inbox.statFollowUpHint")}
        />
        <StatCard
          icon={CalendarDays}
          label={t("portal.inbox.statNext")}
          value={nextEvent?.row.eventDate ? formatDate(nextEvent.row.eventDate, { day: "numeric", month: "short" }) : "—"}
          caption={nextEvent ? `${nextEvent.row.customerName} · ${countdownText(t, nextEvent.days)}` : t("portal.inbox.statNextNone")}
        />
      </section>

      <SegmentedFilter
        ariaLabel={t("portal.inbox.title")}
        value={filter}
        onChange={changeFilter}
        options={INBOX_FILTERS.map((id) => ({ key: id, label: t(FILTER_LABEL[id]), count: counts[id] }))}
      />

      {visible.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-12 text-center ring-1 ring-foreground/8 lg:py-16">
          <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
            {emptyAttention ? <CheckCircle2 className="size-7" aria-hidden /> : <Inbox className="size-7" aria-hidden />}
          </span>
          {emptyAttention ? <h2 className="font-heading text-lg font-semibold">{t("portal.inbox.emptyAttentionTitle")}</h2> : null}
          <p className="max-w-md text-muted-foreground">
            {rows.length === 0
              ? t("portal.inbox.emptyAll")
              : query.trim()
                ? t("portal.inbox.searchEmpty")
                : filter === "attention"
                  ? t("portal.inbox.emptyAttention")
                  : t("portal.inbox.emptyFiltered")}
          </p>
          {emptyAttention && counts.active > 0 ? (
            <button
              type="button"
              onClick={() => changeFilter("active")}
              className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-success px-5 text-app-sm font-semibold text-white"
            >
              {t("portal.inbox.emptyAttentionCta", { count: counts.active })}
            </button>
          ) : null}
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
          <DataTable
            rows={pageItems}
            getRowKey={(row) => row.bookingId}
            columns={columns}
            onRowClick={(row) => router.push(rowHref(row))}
            rowActionLabel={(row) => t("portal.inbox.rowOpenAria", { name: row.customerName })}
            renderMobileItem={(row) => (
              <Link href={rowHref(row)} className={cn("flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted/60")}>
                <InitialsAvatar name={row.customerName} />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate font-semibold text-rn-text-heading">{row.customerName}</span>
                  <span className="truncate text-app-sm text-muted-foreground">
                    {[row.eventDate ? formatDate(row.eventDate) : t("portal.inbox.noDate"), row.eventType, row.reference].filter(Boolean).join(" · ")}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={STATE_TONE[row.state]}>{t(STATE_LABEL[row.state])}</StatusBadge>
                    {row.attention > 0 ? <WaitingChips row={row} t={t} /> : null}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            )}
          />
          <ListPagination
            summary={
              visible.length === 1
                ? t("portal.inbox.summaryOne")
                : visible.length <= TENANT_LIST_PAGE_SIZE
                ? t("portal.inbox.summaryAll", { count: visible.length })
                : t("portal.inbox.summaryRange", {
                    from: (page - 1) * TENANT_LIST_PAGE_SIZE + 1,
                    to: Math.min(page * TENANT_LIST_PAGE_SIZE, visible.length),
                    count: visible.length,
                  })
            }
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </section>
      )}
    </div>
  );
}
