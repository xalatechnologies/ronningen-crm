"use client";

import { ListPagination } from "@/components/ui/list-pagination";
import { InquiryDetailSheet } from "@/components/inquiries/inquiry-detail-sheet";
import { InquiriesFollowUpMonthCalendar } from "@/components/inquiries/inquiries-follow-up-calendar";
import {
  inquiryStatusLabel,
  isActiveInquiry,
  type InquiryCustomerOption,
  type InquiryListRow,
} from "@/components/inquiries/types";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { StatCard } from "@/components/ui/stat-card";
import { ViewSwitch } from "@/components/ui/view-switch";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { usePageSearch } from "@/providers/page-search-provider";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";
import { formatAppDateTime } from "@/lib/format-datetime";
import {
  APP_DATA_BODY,
  APP_DATA_DATE,
  APP_DATA_PRIMARY,
  APP_TABLE_HEAD,
  APP_TABLE_HEAD_BAR,
} from "@/lib/table-typography";
import {
  type BookingInquiryStatus,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { isBefore } from "date-fns";
import {
  AlarmClock,
  ChevronRight,
  FileText,
  Inbox,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TENANT_LIST_PAGE_SIZE } from "@/lib/list-pagination";

const filterEyebrowClass =
  "mb-1.5 block text-[13px] font-semibold text-foreground";

const cardClass = "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8";

const dateFieldClass =
  "h-11 min-h-11 w-full min-w-0 rounded-xl border border-foreground/25 text-app-sm shadow-none sm:h-12 sm:min-h-12 sm:text-app-base";

const inquiriesTableHeadClass = cn(
  "bookings-list-table-head",
  APP_TABLE_HEAD,
);

const inquiriesTableCellPrimaryClass = cn(
  APP_DATA_PRIMARY,
  "inquiries-list-row-title break-words",
);

const inquiriesTableCellBodyClass = cn(
  APP_DATA_BODY,
  "inquiries-list-row-cell break-words",
);

const inquiriesTableCellDateClass = cn(
  APP_DATA_DATE,
  "inquiries-list-row-meta break-words",
);

const listDateOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

type InquiryStatusFilter = "all" | Exclude<BookingInquiryStatus, "converted">;

function matchesInquirySearch(row: InquiryListRow, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const blob = [
    row.customerName,
    row.customerPhone ?? "",
    row.customerEmail ?? "",
    row.propertyName ?? "",
    row.festType ?? "",
    row.eventType,
    row.internalNotes ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes(q);
}

function matchesInquiryPreferredDateRange(
  row: InquiryListRow,
  fromYmd: string,
  toYmd: string,
): boolean {
  if (!fromYmd && !toYmd) return true;
  const start = row.preferredEventDateIso;
  if (!start) return false;
  const end = row.preferredEventEndDateIso?.slice(0, 10) ?? start;

  if (fromYmd && toYmd) {
    const from = fromYmd <= toYmd ? fromYmd : toYmd;
    const to = fromYmd <= toYmd ? toYmd : fromYmd;
    return start <= to && end >= from;
  }
  if (fromYmd) return end >= fromYmd;
  if (toYmd) return start <= toYmd;
  return true;
}

function isOverdueFollowUp(row: InquiryListRow, now = new Date()): boolean {
  if (row.status === "converted" || row.convertedBookingId) return false;
  if (!row.nextFollowUpAtIso) return false;
  const d = new Date(row.nextFollowUpAtIso);
  if (Number.isNaN(d.getTime())) return false;
  return !isBefore(now, d);
}

const INQUIRY_TONE: Record<BookingInquiryStatus, StatusTone> = {
  new: "info",
  contacted: "neutral",
  quote_sent: "warning",
  awaiting_customer: "warning",
  lost: "neutral",
  converted: "success",
};

export type InquiriesSectionProps = {
  inquiries: InquiryListRow[];
  properties: { id: string; name: string }[];
  customers: InquiryCustomerOption[];
  canManageInquiries: boolean;
  loadError: string | null;
};

export function InquiriesSection({
  inquiries,
  properties,
  customers,
  canManageInquiries,
  loadError,
}: InquiriesSectionProps) {
  const { t, locale, formatDate } = useTranslation();
  const { query, setQuery } = usePageSearch();
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>("all");
  const [dueOnly, setDueOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<InquiryListRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [page, setPage] = useState(1);

  function formatInquiryPreferredDate(row: InquiryListRow): string {
    if (!row.preferredEventDateIso) return "—";
    const start = row.preferredEventDateIso.slice(0, 10);
    const startLabel = formatDate(`${start}T12:00:00`, listDateOptions);
    const end = row.preferredEventEndDateIso?.slice(0, 10);
    if (end && end !== start) {
      return `${startLabel} – ${formatDate(`${end}T12:00:00`, listDateOptions)}`;
    }
    return startLabel;
  }

  function formatInquiryListDate(iso: string): string {
    return formatDate(`${iso.slice(0, 10)}T12:00:00`, listDateOptions);
  }

  function inquiryWord(count: number): string {
    return count === 1
      ? t("inquiries.inquirySingular")
      : t("inquiries.inquiryPlural");
  }

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, dueOnly, dateFrom, dateTo]);

  const activeInquiries = useMemo(
    () => inquiries.filter(isActiveInquiry),
    [inquiries],
  );

  const filterCounts = useMemo(() => {
    const counts = {
      all: activeInquiries.length,
      new: 0,
      contacted: 0,
      quote_sent: 0,
      awaiting_customer: 0,
      lost: 0,
    } satisfies Record<InquiryStatusFilter, number>;
    for (const row of activeInquiries) {
      if (row.status === "converted") continue;
      counts[row.status] += 1;
    }
    return counts;
  }, [activeInquiries]);

  const overdueCount = useMemo(
    () => activeInquiries.filter((row) => isOverdueFollowUp(row)).length,
    [activeInquiries],
  );

  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    dueOnly ||
    dateFrom !== "" ||
    dateTo !== "";

  const filtered = useMemo(() => {
    return activeInquiries.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (dueOnly && !isOverdueFollowUp(row)) return false;
      if (!matchesInquiryPreferredDateRange(row, dateFrom, dateTo)) return false;
      if (!matchesInquirySearch(row, query)) return false;
      return true;
    });
  }, [activeInquiries, query, statusFilter, dueOnly, dateFrom, dateTo]);

  const pagination = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filtered.length / TENANT_LIST_PAGE_SIZE),
    );
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * TENANT_LIST_PAGE_SIZE;
    return {
      totalPages,
      currentPage,
      pageRows: filtered.slice(start, start + TENANT_LIST_PAGE_SIZE),
    };
  }, [filtered, page]);

  const { totalPages, currentPage, pageRows } = pagination;

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setDueOnly(false);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function openRow(row: InquiryListRow) {
    setSelected(row);
    setSheetOpen(true);
  }

  const footerExtra =
    filtered.length !== activeInquiries.length
      ? t("inquiries.footer.extraMatches", { total: activeInquiries.length })
      : ` ${inquiryWord(filtered.length)}`;

  return (
    <div className="inquiries-page-workspace mx-auto flex w-full flex-col gap-8 pb-24 md:pb-8">
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <div className="inquiries-list-hero">
            <AppPageHeader
              className="mb-0"
              surface="default"
              title={t("inquiries.title")}
              actions={
                <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                  {!loadError ? (
                    <ViewSwitch
                      value={showCalendarView ? "calendar" : "list"}
                      onChange={(next) => setShowCalendarView(next === "calendar")}
                      listLabel={t("common.view.list")}
                      calendarLabel={t("common.view.calendar")}
                      ariaLabel={t("common.view.switchAria")}
                    />
                  ) : null}
                  {canManageInquiries ? (
                    <Link
                      href="/app/inquiries/new"
                      className={cn(
                        buttonVariants({ variant: "success", size: "cta" }),
                        "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 shadow-none sm:w-auto md:px-8",
                      )}
                    >
                      <Plus className="size-5" aria-hidden />
                      {t("inquiries.new")}
                    </Link>
                  ) : null}
                </div>
              }
            />
          </div>
        </div>

        {loadError ? (
          <div role="alert">
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-destructive">
              {t("inquiries.loadError", { error: loadError })}
            </div>
          </div>
        ) : null}

        {!loadError ? (
          <section
            className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
            aria-label={t("inquiries.title")}
          >
            <StatCard icon={Inbox} label={t("inquiries.title")} value={activeInquiries.length} />
            <StatCard
              icon={Sparkles}
              label={inquiryStatusLabel("new", t)}
              value={filterCounts.new}
            />
            <StatCard
              icon={FileText}
              label={inquiryStatusLabel("quote_sent", t)}
              value={filterCounts.quote_sent}
            />
            <StatCard
              icon={AlarmClock}
              label={t("inquiries.overdueFollowUp")}
              value={overdueCount}
              className={cn(overdueCount > 0 && "ring-status-danger-border")}
            />
          </section>
        ) : null}

        {!loadError ? (
          <section
            className={cn("inquiries-list-filters flex flex-col gap-4 px-4 py-5 sm:px-6", cardClass)}
            aria-label={t("inquiries.searchFilterAria")}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <SegmentedFilter
                ariaLabel={t("common.fields.status")}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { key: "all", label: t("common.actions.all"), count: filterCounts.all },
                  { key: "new", label: inquiryStatusLabel("new", t), count: filterCounts.new, tone: "info" },
                  { key: "contacted", label: inquiryStatusLabel("contacted", t), count: filterCounts.contacted, tone: "neutral" },
                  { key: "quote_sent", label: inquiryStatusLabel("quote_sent", t), count: filterCounts.quote_sent, tone: "warning" },
                  { key: "awaiting_customer", label: inquiryStatusLabel("awaiting_customer", t), count: filterCounts.awaiting_customer, tone: "warning" },
                  { key: "lost", label: inquiryStatusLabel("lost", t), count: filterCounts.lost, tone: "neutral" },
                ]}
              />
              <button
                type="button"
                aria-pressed={dueOnly}
                onClick={() => setDueOnly((v) => !v)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-app-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-success/40",
                  dueOnly
                    ? "border-status-danger-border bg-status-danger-bg text-status-danger-text"
                    : "border-foreground/25 bg-card text-foreground hover:bg-muted",
                )}
              >
                <AlarmClock className="size-4 shrink-0" aria-hidden />
                {t("inquiries.overdueFollowUp")}
                <span className="tabular-nums opacity-70">{overdueCount}</span>
              </button>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,1fr))_auto] lg:items-end">
              <div className="min-w-0">
                <Label htmlFor="inquiries-date-from" className={filterEyebrowClass}>
                  {t("inquiries.dateFrom")}
                </Label>
                <DatePickerField
                  id="inquiries-date-from"
                  value={dateFrom}
                  onChange={setDateFrom}
                  maxYmd={dateTo || undefined}
                  variant="toolbar"
                  className={dateFieldClass}
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="inquiries-date-to" className={filterEyebrowClass}>
                  {t("inquiries.dateTo")}
                </Label>
                <DatePickerField
                  id="inquiries-date-to"
                  value={dateTo}
                  onChange={setDateTo}
                  minYmd={dateFrom || undefined}
                  variant="toolbar"
                  className={dateFieldClass}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={!hasActiveFilters}
                className="h-11 gap-2 rounded-xl px-4 font-heading text-app-sm font-semibold sm:col-span-2 sm:h-12 lg:col-span-1"
                onClick={resetFilters}
              >
                <RotateCcw className="size-4 shrink-0" aria-hidden />
                {t("inquiries.resetFilters")}
              </Button>
            </div>

            {hasActiveFilters ? (
              <p className="text-app-sm text-muted-foreground">
                {t("inquiries.showingCount", {
                  shown: filtered.length,
                  total: activeInquiries.length,
                  label: inquiryWord(activeInquiries.length),
                })}
              </p>
            ) : null}
          </section>
        ) : null}

        {!loadError && filtered.length === 0 ? (
          <div className={cn("flex flex-col items-center gap-4 px-6 py-16 text-center", cardClass)}>
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Inbox className="size-8 text-muted-foreground" aria-hidden />
            </div>
            <p className="max-w-sm text-muted-foreground">
              {activeInquiries.length === 0
                ? t("inquiries.emptyNone")
                : t("inquiries.emptyFiltered")}
            </p>
            {canManageInquiries && activeInquiries.length === 0 ? (
              <Link
                href="/app/inquiries/new"
                className={cn(
                  buttonVariants({ variant: "success", size: "cta" }),
                  "inline-flex items-center gap-2 rounded-xl shadow-none",
                )}
              >
                <Plus className="size-4" aria-hidden />
                {t("inquiries.new")}
              </Link>
            ) : null}
          </div>
        ) : null}

        {!loadError && filtered.length > 0 && showCalendarView ? (
          <div className={cardClass}>
            <InquiriesFollowUpMonthCalendar
              rows={filtered}
              totalInquiriesCount={activeInquiries.length}
              onSelectInquiry={openRow}
            />
          </div>
        ) : null}

        {!loadError && filtered.length > 0 && !showCalendarView ? (
          <div className={cardClass}>
            <div
              className={cn(
                "hidden grid-cols-12 md:grid",
                APP_TABLE_HEAD_BAR,
              )}
            >
              <div className={cn("col-span-3", inquiriesTableHeadClass)}>
                {t("inquiries.tableCustomer")}
              </div>
              <div className={cn("col-span-2", inquiriesTableHeadClass)}>
                {t("inquiries.tableVenue")}
              </div>
              <div className={cn("col-span-2", inquiriesTableHeadClass)}>
                {t("inquiries.tablePreferredDate")}
              </div>
              <div className={cn("col-span-2", inquiriesTableHeadClass)}>
                {t("common.fields.status")}
              </div>
              <div className={cn("col-span-2", inquiriesTableHeadClass)}>
                {t("inquiries.tableNextFollowUp")}
              </div>
              <div className={cn("col-span-1 text-right", inquiriesTableHeadClass)}>
                {t("inquiries.tableUpdated")}
              </div>
            </div>
            <div className="divide-y divide-foreground/6">
              {pageRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={cn(
                    "grid w-full grid-cols-1 gap-3 px-4 py-3.5 text-left font-inherit text-foreground transition-colors sm:px-6 md:grid-cols-12 md:items-center md:gap-4",
                    "cursor-pointer border-0 bg-transparent outline-none hover:bg-rn-surface-row-hover",
                    "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-inset",
                  )}
                  onClick={() => openRow(row)}
                  aria-label={t("inquiries.openAria", { name: row.customerName })}
                >
                  <div className="flex min-w-0 items-start gap-3 md:col-span-3">
                    <CustomerAvatar name={row.customerName} />
                    <div className="min-w-0">
                    <h4 className={inquiriesTableCellPrimaryClass}>
                      {row.customerName}
                    </h4>
                    {row.customerPhone?.trim() ? (
                      <p className="inquiries-list-row-meta mt-0.5 flex items-center gap-1.5 text-app-sm text-muted-foreground">
                        <Phone
                          className="size-3.5 shrink-0 text-rn-text-slate"
                          aria-hidden
                        />
                        <span className="tabular-nums break-words">
                          {row.customerPhone.trim()}
                        </span>
                      </p>
                    ) : null}
                    {row.customerEmail?.trim() ? (
                      <p className="inquiries-list-row-meta mt-0.5 flex items-start gap-1.5 text-app-sm text-muted-foreground">
                        <Mail
                          className="mt-0.5 size-3.5 shrink-0 text-rn-text-slate"
                          aria-hidden
                        />
                        <span className="min-w-0 break-words">
                          {row.customerEmail.trim()}
                        </span>
                      </p>
                    ) : null}
                    <p className="inquiries-list-row-meta mt-1 text-muted-foreground md:hidden">
                      {row.propertyName ?? "—"}
                      {" · "}
                      {formatInquiryPreferredDate(row)}
                    </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "hidden min-w-0 md:col-span-2 md:block",
                      inquiriesTableCellBodyClass,
                    )}
                  >
                    {row.propertyName ?? "—"}
                  </div>
                  <div
                    className={cn(
                      "hidden min-w-0 md:col-span-2 md:block",
                      inquiriesTableCellDateClass,
                    )}
                  >
                    {formatInquiryPreferredDate(row)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                    <StatusBadge tone={INQUIRY_TONE[row.status]} className="inquiries-list-status-pill">
                      {inquiryStatusLabel(row.status, t)}
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:col-span-3 md:grid-cols-2">
                    <div className="min-w-0">
                      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">
                        {t("inquiries.tableNextFollowUp")}
                      </p>
                      <p
                        className={cn(
                          inquiriesTableCellDateClass,
                          isOverdueFollowUp(row) && "inline-flex items-center gap-1.5 font-semibold text-status-danger-text",
                        )}
                      >
                        {isOverdueFollowUp(row) ? <TriangleAlert className="size-4 shrink-0" aria-hidden /> : null}
                        {row.nextFollowUpAtIso
                          ? formatAppDateTime(row.nextFollowUpAtIso, locale)
                          : "—"}
                      </p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">
                        {t("inquiries.tableUpdated")}
                      </p>
                      <span className="inline-flex w-full items-center justify-end gap-2">
                        <span className={inquiriesTableCellDateClass}>
                          {formatInquiryListDate(row.updatedAtIso)}
                        </span>
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground/75"
                          aria-hidden
                        />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {filtered.length > TENANT_LIST_PAGE_SIZE ? (
              <ListPagination
  summaryClassName="inquiries-list-footer-caption"
  summary={<>
                  {t("inquiries.footer.showingRange", {
                    from: (currentPage - 1) * TENANT_LIST_PAGE_SIZE + 1,
                    to: Math.min(
                      currentPage * TENANT_LIST_PAGE_SIZE,
                      filtered.length,
                    ),
                    filtered: filtered.length,
                    extra: footerExtra,
                  })}
                </>}
  page={currentPage}
  totalPages={totalPages}
  onPageChange={setPage}
/>
            ) : null}
          </div>
        ) : null}
      </div>

      <InquiryDetailSheet
        inquiry={selected}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelected(null);
        }}
        properties={properties}
        customers={customers}
        canManage={canManageInquiries}
      />
    </div>
  );
}
