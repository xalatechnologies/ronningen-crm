"use client";

import { InquiryDetailSheet } from "@/components/inquiries/inquiry-detail-sheet";
import { InquiriesFollowUpMonthCalendar } from "@/components/inquiries/inquiries-follow-up-calendar";
import {
  inquiryStatusLabel,
  isActiveInquiry,
  type InquiryListRow,
} from "@/components/inquiries/types";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/i18n/client";
import { formatAppDateTime } from "@/lib/format-datetime";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  APP_TABLE_CELL_BODY,
  APP_TABLE_CELL_DATE,
  APP_TABLE_CELL_PRIMARY,
  APP_TABLE_HEAD,
} from "@/lib/table-typography";
import {
  type BookingInquiryStatus,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { isBefore } from "date-fns";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Inbox, ListFilter, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TENANT_LIST_PAGE_SIZE } from "@/lib/list-pagination";

const inquiriesTableHeadClass = cn("bookings-list-table-head", APP_TABLE_HEAD);

const inquiriesTableCellPrimaryClass = cn(
  APP_TABLE_CELL_PRIMARY,
  "inquiries-list-row-title",
);

const inquiriesTableCellBodyClass = cn(
  APP_TABLE_CELL_BODY,
  "inquiries-list-row-cell",
);

const inquiriesTableCellDateClass = cn(
  APP_TABLE_CELL_DATE,
  "inquiries-list-row-meta",
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

function statusBadgeClass(status: BookingInquiryStatus): string {
  if (status === "converted")
    return "border-success/50 bg-success/15 text-success";
  if (status === "lost") return "border-muted-foreground/40 bg-muted/50";
  return "border-rn-border-strong bg-card";
}

export type InquiriesSectionProps = {
  inquiries: InquiryListRow[];
  properties: { id: string; name: string }[];
  customers: { id: string; name: string }[];
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
  const [query, setQuery] = useState("");
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

  const menuFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (dueOnly ? 1 : 0);

  const filterButtonLabel = useMemo(() => {
    if (statusFilter !== "all" && dueOnly) return t("inquiries.filterActive");
    if (statusFilter !== "all") {
      return inquiryStatusLabel(statusFilter, t);
    }
    if (dueOnly) return t("inquiries.overdueFollowUp");
    return t("common.actions.filter");
  }, [statusFilter, dueOnly, t]);

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
      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="border-b-2 border-rn-border-strong bg-card/80 px-[length:var(--app-card-padding)] py-6 md:py-7">
          <AppPageHeader
            className="mb-0 gap-3 md:gap-4"
            surface="default"
            title={t("inquiries.title")}
            actions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!loadError ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="cta"
                    className="gap-2 border-2 border-rn-border-strong font-semibold"
                    aria-expanded={showCalendarView}
                    onClick={() => setShowCalendarView((v) => !v)}
                  >
                    <Calendar className="size-5 shrink-0" aria-hidden />
                    {showCalendarView
                      ? t("inquiries.showList")
                      : t("inquiries.followUpCalendar")}
                  </Button>
                ) : null}
                {canManageInquiries ? (
                  <Link
                    href="/app/inquiries/new"
                    className={cn(
                      buttonVariants({ variant: "success", size: "cta" }),
                      "inline-flex items-center justify-center gap-2",
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

        {loadError ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="alert"
          >
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
              {t("inquiries.loadError", { error: loadError })}
            </div>
          </div>
        ) : null}

        {!loadError ? (
          <section
            className="border-t border-rn-border-strong/35 px-6 py-5 md:px-8 md:py-6"
            aria-label={t("inquiries.searchFilterAria")}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
                  aria-hidden
                />
                <Input
                  id="inquiries-search"
                  aria-label={t("inquiries.searchAria")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("inquiries.searchPlaceholder")}
                  autoComplete="off"
                  className="h-12 w-full rounded-md border-2 border-rn-border-strong bg-background pl-12 text-app-base text-foreground shadow-sm md:h-14 md:pl-14 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                />
              </div>

              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 lg:ml-auto">
                <div className="w-full shrink-0 sm:w-40 md:w-44">
                  <label htmlFor="inquiries-date-from" className="sr-only">
                    {t("inquiries.dateFrom")}
                  </label>
                  <DatePickerField
                    id="inquiries-date-from"
                    value={dateFrom}
                    onChange={setDateFrom}
                    maxYmd={dateTo || undefined}
                    variant="toolbar"
                    className="h-12 min-h-12 text-sm md:h-14 md:min-h-14 md:text-base"
                  />
                </div>
                <div className="w-full shrink-0 sm:w-40 md:w-44">
                  <label htmlFor="inquiries-date-to" className="sr-only">
                    {t("inquiries.dateTo")}
                  </label>
                  <DatePickerField
                    id="inquiries-date-to"
                    value={dateTo}
                    onChange={setDateTo}
                    minYmd={dateFrom || undefined}
                    variant="toolbar"
                    className="h-12 min-h-12 text-sm md:h-14 md:min-h-14 md:text-base"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-12 min-h-12 gap-2 rounded-md border-2 border-rn-border-strong px-4 font-heading text-sm font-semibold shadow-sm md:h-14 md:min-h-14 md:px-5 md:text-base",
                      menuFilterCount > 0 &&
                        "border-success/50 bg-success/5 text-foreground",
                    )}
                    aria-label={t("inquiries.openFilterMenu")}
                  >
                    <ListFilter className="size-4 shrink-0" aria-hidden />
                    <span>{filterButtonLabel}</span>
                    {menuFilterCount > 0 ? (
                      <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-success px-1.5 py-0.5 text-xs font-bold text-white tabular-nums">
                        {menuFilterCount}
                      </span>
                    ) : null}
                    <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className="min-w-56 rounded-md border-2 border-rn-border-strong p-2 shadow-rn-card"
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.fields.status")}
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={statusFilter}
                        onValueChange={(value) => {
                          if (!value) return;
                          setStatusFilter(value as InquiryStatusFilter);
                        }}
                      >
                        {(
                          [
                            "all",
                            "new",
                            "contacted",
                            "quote_sent",
                            "awaiting_customer",
                            "lost",
                          ] as const
                        ).map((key) => (
                          <DropdownMenuRadioItem
                            key={key}
                            value={key}
                            className="font-medium"
                          >
                            {key === "all"
                              ? t("common.actions.all")
                              : inquiryStatusLabel(key, t)}
                            <DropdownMenuShortcut>
                              {filterCounts[key]}
                            </DropdownMenuShortcut>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator className="my-2" />

                    <DropdownMenuCheckboxItem
                      checked={dueOnly}
                      onCheckedChange={(checked) => setDueOnly(checked === true)}
                      className="font-medium"
                    >
                      {t("inquiries.overdueFollowUp")}
                      <DropdownMenuShortcut>{overdueCount}</DropdownMenuShortcut>
                    </DropdownMenuCheckboxItem>

                    {hasActiveFilters ? (
                      <>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem
                          variant="destructive"
                          className="font-medium"
                          onSelect={() => resetFilters()}
                        >
                          {t("inquiries.resetFilters")}
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {hasActiveFilters ? (
              <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
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
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-md border-2 border-rn-border-strong bg-muted/40">
              <Inbox className="size-8 text-muted-foreground" aria-hidden />
            </div>
            <p className="max-w-sm text-muted-foreground">
              {activeInquiries.length === 0
                ? t("inquiries.emptyNone")
                : t("inquiries.emptyFiltered")}
            </p>
          </div>
        ) : null}

        {!loadError && filtered.length > 0 && showCalendarView ? (
          <InquiriesFollowUpMonthCalendar
            rows={filtered}
            totalInquiriesCount={activeInquiries.length}
            onSelectInquiry={openRow}
          />
        ) : null}

        {!loadError && filtered.length > 0 && !showCalendarView ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
                  <TableHead className={cn(inquiriesTableHeadClass, "pl-6 md:pl-8")}>
                    {t("inquiries.tableCustomer")}
                  </TableHead>
                  <TableHead className={inquiriesTableHeadClass}>
                    {t("inquiries.tableVenue")}
                  </TableHead>
                  <TableHead className={inquiriesTableHeadClass}>
                    {t("inquiries.tablePreferredDate")}
                  </TableHead>
                  <TableHead className={inquiriesTableHeadClass}>
                    {t("common.fields.status")}
                  </TableHead>
                  <TableHead className={inquiriesTableHeadClass}>
                    {t("inquiries.tableNextFollowUp")}
                  </TableHead>
                  <TableHead
                    className={cn(inquiriesTableHeadClass, "pr-6 text-right md:pr-8")}
                  >
                    {t("inquiries.tableUpdated")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group cursor-pointer border-rn-border-strong/40 hover:bg-rn-surface-row-hover"
                    onClick={() => openRow(row)}
                    aria-label={t("inquiries.openAria", { name: row.customerName })}
                  >
                    <TableCell className={inquiriesTableCellPrimaryClass}>
                      {row.customerName}
                    </TableCell>
                    <TableCell className={inquiriesTableCellBodyClass}>
                      {row.propertyName ?? "—"}
                    </TableCell>
                    <TableCell className={inquiriesTableCellDateClass}>
                      {formatInquiryPreferredDate(row)}
                    </TableCell>
                    <TableCell className={inquiriesTableCellBodyClass}>
                      <span
                        className={cn(
                          "inline-flex rounded-md border-2 px-2.5 py-0.5 text-xs font-semibold md:text-sm",
                          statusBadgeClass(row.status),
                        )}
                      >
                        {inquiryStatusLabel(row.status, t)}
                      </span>
                    </TableCell>
                    <TableCell className={inquiriesTableCellDateClass}>
                      {row.nextFollowUpAtIso
                        ? formatAppDateTime(row.nextFollowUpAtIso, locale)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(inquiriesTableCellDateClass, "text-right")}
                    >
                      <span className="inline-flex w-full items-center justify-end gap-2">
                        <span>
                          {formatInquiryListDate(row.updatedAtIso)}
                        </span>
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground/75 transition-colors group-hover:text-rn-text-heading group-hover:opacity-100 opacity-80"
                          aria-hidden
                        />
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > TENANT_LIST_PAGE_SIZE ? (
              <div className="flex flex-col items-stretch justify-between gap-4 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 sm:flex-row sm:items-center sm:px-8 md:py-6">
                <span className="text-app-sm font-medium text-rn-footer-text md:text-app-base">
                  {t("inquiries.footer.showingRange", {
                    from: (currentPage - 1) * TENANT_LIST_PAGE_SIZE + 1,
                    to: Math.min(
                      currentPage * TENANT_LIST_PAGE_SIZE,
                      filtered.length,
                    ),
                    filtered: filtered.length,
                    extra: footerExtra,
                  })}
                </span>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
                    disabled={currentPage <= 1}
                    aria-label={t("common.pagination.prevPage")}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-[18px]" />
                  </Button>
                  <span className="min-w-[5.5rem] text-center text-app-sm font-semibold tabular-nums text-muted-foreground">
                    {t("common.pagination.pageOf", {
                      current: currentPage,
                      total: totalPages,
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
                    disabled={currentPage >= totalPages}
                    aria-label={t("common.pagination.nextPage")}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    <ChevronRight className="size-[18px]" />
                  </Button>
                </div>
              </div>
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
