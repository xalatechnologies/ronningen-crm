"use client";

import { ListPagination } from "@/components/ui/list-pagination";
import type {
  BookingListRow,
  BookingStatus,
} from "@/components/bookings/types";
import {
  BookingsMonthCalendar,
  BookingsMonthCalendarToolbar,
  useBookingsMonthCalendarNavigation,
} from "@/components/bookings/bookings-month-calendar";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { ViewSwitch } from "@/components/ui/view-switch";
import { statusDotClass, statusTextClass } from "@/components/ui/status-badge";
import { BookingDetailSheet } from "@/components/bookings/booking-detail-sheet";
import { BookingListContractAction } from "@/components/bookings/booking-list-contract-action";
import { BookingListPortalAction } from "@/components/bookings/booking-list-portal-action";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { usePageSearch } from "@/providers/page-search-provider";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { BOOKING_PAYMENT_STATUS_VALUES, bookingPaymentStatusLabel } from "@/constants/booking-payment-status";
import { useTranslation } from "@/i18n/client";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { bookingConflictMessageKey } from "@/lib/bookings/booking-conflict-error";
import { sortBookingsByUpcomingFirst } from "@/lib/bookings/list-sort";
import { cn } from "@/lib/utils";
import { APP_LIST_ROW_DATE, APP_TABLE_HEAD, APP_TABLE_HEAD_BAR } from "@/lib/table-typography";
import {
  ArrowDownRight,
  ArrowUpRight,
  Phone,
  Plus,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useSupabase } from "@/providers/supabase-provider";

import { computeBookingsQuickStats } from "@/lib/bookings/quick-stats";

const bookingsTableHeadClass = cn(
  "bookings-list-table-head",
  APP_TABLE_HEAD,
);

import { TENANT_LIST_PAGE_SIZE } from "@/lib/list-pagination";

const filterEyebrowClass =
  "mb-1.5 block text-[13px] font-semibold text-foreground";

const cardClass = "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8";

const filterFieldClass =
  "h-11 min-h-11 w-full min-w-0 rounded-xl border border-foreground/25 text-app-sm shadow-none sm:h-12 sm:min-h-12 sm:text-app-base";

type BookingStatusFilter = "all" | "confirmed" | "pending" | "cancelled";
type BookingPaymentFilter = "" | "unpaid" | "partial" | "paid";
type BookingAudienceFilter = "" | "Privat" | "Bedrift";

function matchesBookingSearch(row: BookingListRow, query: string): boolean {
  if (!query) return true;
  const blob = [
    row.customer,
    row.customerPhone ?? "",
    row.customerEmail ?? "",
    row.bookingReference ?? "",
    row.eventType,
    row.festType ?? "",
    row.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes(query);
}

function matchesBookingDateRange(
  row: BookingListRow,
  fromYmd: string,
  toYmd: string,
): boolean {
  const start = row.eventDateIso.slice(0, 10);
  const end = row.eventEndDateIso?.slice(0, 10) ?? start;

  if (fromYmd && toYmd) {
    const from = fromYmd <= toYmd ? fromYmd : toYmd;
    const to = fromYmd <= toYmd ? toYmd : fromYmd;
    return start <= to && end >= from;
  }
  if (fromYmd) return end >= fromYmd;
  if (toYmd) return start <= toYmd;
  return true;
}

function formatNokCompact(n: number, formatCurrency: (amount: number) => string) {
  const formatted = formatCurrency(n).replace(/\s?NOK$/, "");
  return (
    <>
      <span className="tracking-tight">{formatted}</span>{" "}
      <span className="text-app-lg font-medium tracking-normal opacity-70 md:text-app-2xl">NOK</span>
    </>
  );
}

function BookingsFiltersSection({
  query,
  setQuery,
  filter,
  setFilter,
  paymentFilter,
  setPaymentFilter,
  audienceFilter,
  setAudienceFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onResetFilters,
  filterCounts,
  secondaryRowEnd,
}: {
  query: string;
  setQuery: (q: string) => void;
  filter: BookingStatusFilter;
  setFilter: (f: BookingStatusFilter) => void;
  paymentFilter: BookingPaymentFilter;
  setPaymentFilter: (f: BookingPaymentFilter) => void;
  audienceFilter: BookingAudienceFilter;
  setAudienceFilter: (f: BookingAudienceFilter) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  onResetFilters: () => void;
  filterCounts: {
    all: number;
    confirmed: number;
    pending: number;
    cancelled: number;
  };
  secondaryRowEnd?: ReactNode;
}) {
  const { t } = useTranslation();
  const hasActiveFilters =
    query.trim() !== "" ||
    filter !== "all" ||
    paymentFilter !== "" ||
    audienceFilter !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  return (
    <section
      className={cn("bookings-list-filters px-4 py-5 sm:px-6 md:px-8 md:py-6", cardClass)}
      aria-label={t("bookings.searchFilterAria")}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="min-w-0 w-full">
            <p className={filterEyebrowClass}>{t("common.fields.status")}</p>
            <SegmentedFilter
              ariaLabel={t("bookings.filterStatusAria")}
              value={filter}
              onChange={setFilter}
              options={[
                { key: "all", label: t("common.actions.all"), count: filterCounts.all },
                { key: "confirmed", label: statusLabel("confirmed", t), count: filterCounts.confirmed, tone: "success" },
                { key: "pending", label: statusLabel("pending", t), count: filterCounts.pending, tone: "warning" },
                { key: "cancelled", label: statusLabel("cancelled", t), count: filterCounts.cancelled, tone: "danger" },
              ]}
            />
          </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <div className="min-w-0">
            <Label htmlFor="bookings-date-from" className={filterEyebrowClass}>
              {t("bookings.dateFrom")}
            </Label>
            <DatePickerField
              id="bookings-date-from"
              value={dateFrom}
              onChange={setDateFrom}
              maxYmd={dateTo || undefined}
              variant="toolbar"
              className={filterFieldClass}
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="bookings-date-to" className={filterEyebrowClass}>
              {t("bookings.dateTo")}
            </Label>
            <DatePickerField
              id="bookings-date-to"
              value={dateTo}
              onChange={setDateTo}
              minYmd={dateFrom || undefined}
              variant="toolbar"
              className={filterFieldClass}
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="bookings-payment-filter" className={filterEyebrowClass}>
              {t("bookings.payment")}
            </Label>
            <FormSelect
              id="bookings-payment-filter"
              value={paymentFilter}
              onValueChange={(v) => setPaymentFilter(v as BookingPaymentFilter)}
              aria-label={t("bookings.filterPaymentAria")}
              className={filterFieldClass}
              placeholder={t("bookings.allPayments")}
              options={BOOKING_PAYMENT_STATUS_VALUES.filter((v) =>
                ["unpaid", "partial", "paid"].includes(v),
              ).map((v) => ({
                value: v,
                label: bookingPaymentStatusLabel(v, t),
              }))}
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="bookings-audience-filter" className={filterEyebrowClass}>
              {t("common.fields.type")}
            </Label>
            <FormSelect
              id="bookings-audience-filter"
              value={audienceFilter}
              onValueChange={(v) => setAudienceFilter(v as BookingAudienceFilter)}
              aria-label={t("bookings.filterTypeAria")}
              className={filterFieldClass}
              placeholder={t("bookings.allTypes")}
              options={[
                { value: "Privat", label: t("bookings.private") },
                { value: "Bedrift", label: t("bookings.corporate") },
              ]}
            />
          </div>
          <div className="flex min-w-0 sm:col-span-2 lg:col-span-4 xl:col-span-1 xl:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={!hasActiveFilters}
              className="h-11 w-full min-w-0 gap-2 rounded-xl border border-foreground/30 bg-card px-4 font-heading text-app-sm font-semibold shadow-none hover:bg-muted disabled:border-foreground/15 sm:h-12 sm:text-app-base xl:w-auto xl:min-w-[11.5rem]"
              onClick={onResetFilters}
            >
              <RotateCcw className="size-4 shrink-0" aria-hidden />
              {t("bookings.resetFilters")}
            </Button>
          </div>
        </div>

        {secondaryRowEnd ? (
          <div className="flex min-w-0 flex-wrap items-end justify-end gap-2 border-t border-foreground/10 pt-3">
            {secondaryRowEnd}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type BookingsFiltersSectionProps = Parameters<typeof BookingsFiltersSection>[0];

function BookingsCalendarPanel({
  filtered,
  totalBookingsCount,
  onSelectBooking,
  filters,
}: {
  filtered: BookingListRow[];
  totalBookingsCount: number;
  onSelectBooking: (id: string) => void;
  filters: Omit<BookingsFiltersSectionProps, "secondaryRowEnd">;
}) {
  const navigation = useBookingsMonthCalendarNavigation(filtered);

  return (
    <>
      <BookingsFiltersSection
        {...filters}
        secondaryRowEnd={<BookingsMonthCalendarToolbar {...navigation} />}
      />
      <div className={cardClass}>
        <BookingsMonthCalendar
          rows={filtered}
          totalBookingsCount={totalBookingsCount}
          onSelectBooking={onSelectBooking}
          navigation={navigation}
          hideToolbar
        />
      </div>
    </>
  );
}

function FindBookingsCardHeader({
  view,
  setView,
}: {
  view: "list" | "calendar";
  setView: (v: "list" | "calendar") => void;
}) {
  const { t } = useTranslation();
  const { canManageBookings } = useOrganizationPermissions();
  return (
    <header>
      <div className="bookings-list-hero">
        <AppPageHeader
          className="mb-0"
          surface="default"
          title={t("bookings.title")}
          actions={
          <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
            <ViewSwitch
              value={view}
              onChange={setView}
              listLabel={t("common.view.list")}
              calendarLabel={t("common.view.calendar")}
              ariaLabel={t("common.view.switchAria")}
            />
            {canManageBookings ? (
              <Link
                href="/app/bookings/new"
                className={cn(buttonVariants({ variant: "success", size: "cta" }), "rounded-xl shadow-none")}
              >
                <Plus className="size-5" aria-hidden />
                {t("bookings.new")}
              </Link>
            ) : null}
          </div>
        }
        />
      </div>
    </header>
  );
}

export type BookingsListProps = {
  bookings: BookingListRow[];
  loadError: string | null;
  /** Owner/admin — matches RLS for bookings delete. */
  canDeleteBookings?: boolean;
};

export function BookingsList({
  bookings,
  loadError,
  canDeleteBookings = false,
}: BookingsListProps) {
  const { t, formatCurrency } = useTranslation();
  const supabase = useSupabase();
  const { invalidateBookings } = useTenantDataInvalidation();
  const [view, setView] = useState<"list" | "calendar">("list");
  const { query, setQuery } = usePageSearch();
  const [filter, setFilter] = useState<BookingStatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<BookingPaymentFilter>("");
  const [audienceFilter, setAudienceFilter] = useState<BookingAudienceFilter>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  function resetFilters() {
    setQuery("");
    setFilter("all");
    setPaymentFilter("");
    setAudienceFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  useEffect(() => {
    setPage(1);
  }, [query, filter, paymentFilter, audienceFilter, dateFrom, dateTo]);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );

  const [pendingStatusConfirm, setPendingStatusConfirm] = useState<{
    id: string;
    next: BookingStatus;
    message: string;
  } | null>(null);

  const selectedRow = useMemo(
    () =>
      selectedBookingId
        ? (bookings.find((b) => b.id === selectedBookingId) ?? null)
        : null,
    [bookings, selectedBookingId],
  );

  async function runBookingStatusUpdate(id: string, next: BookingStatus) {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: next })
        .eq("id", id);

      if (error) {
        toast.error(t("bookings.statusUpdateFailed"), {
          description: bookingConflictMessageKey(error)
            ? t(bookingConflictMessageKey(error)!)
            : error.message,
        });
        return;
      }

      toast.success(
        next === "confirmed"
          ? t("bookings.statusUpdated.confirmed")
          : next === "cancelled"
            ? t("bookings.statusUpdated.cancelled")
            : t("bookings.statusUpdated.pending"),
      );
      invalidateBookings();
      setSelectedBookingId((current) => (current === id ? null : current));
    } finally {
      setUpdatingId(null);
    }
  }

  async function setBookingStatus(
    id: string,
    next: BookingStatus,
    opts?: { confirmMessage?: string },
  ) {
    if (opts?.confirmMessage) {
      setPendingStatusConfirm({
        id,
        next,
        message: opts.confirmMessage,
      });
      return;
    }
    await runBookingStatusUpdate(id, next);
  }

  async function confirmPendingStatusChange() {
    const pending = pendingStatusConfirm;
    if (!pending) return;
    setPendingStatusConfirm(null);
    await runBookingStatusUpdate(pending.id, pending.next);
  }

  const quickStats = useMemo(
    () => computeBookingsQuickStats(bookings),
    [bookings],
  );

  const filterCounts = useMemo(() => {
    const counts = { all: bookings.length, confirmed: 0, pending: 0, cancelled: 0 };
    for (const b of bookings) {
      if (b.status === "confirmed") counts.confirmed += 1;
      else if (b.status === "pending") counts.pending += 1;
      else if (b.status === "cancelled") counts.cancelled += 1;
    }
    return counts;
  }, [bookings]);

  const filtered = useMemo(() => {
    let rows = bookings;
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => matchesBookingSearch(r, q));
    }
    if (filter === "confirmed") {
      rows = rows.filter((r) => r.status === "confirmed");
    } else if (filter === "pending") {
      rows = rows.filter((r) => r.status === "pending");
    } else if (filter === "cancelled") {
      rows = rows.filter((r) => r.status === "cancelled");
    }
    if (paymentFilter) {
      rows = rows.filter((r) => r.paymentStatus === paymentFilter);
    }
    if (audienceFilter) {
      rows = rows.filter((r) => r.eventTypeForm === audienceFilter);
    }
    if (dateFrom || dateTo) {
      rows = rows.filter((r) => matchesBookingDateRange(r, dateFrom, dateTo));
    }
    return sortBookingsByUpcomingFirst(rows);
  }, [bookings, query, filter, paymentFilter, audienceFilter, dateFrom, dateTo]);

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

  const trendPositive =
    quickStats.monthOverMonthPct != null &&
    quickStats.monthOverMonthPct >= 0;

  return (
    <div className="flex w-full flex-col gap-8 pb-24 md:pb-10">
      {loadError ? (
        <div
          className="rounded-xl bg-destructive/10 px-4 py-3 text-app-sm text-destructive md:text-app-base"
          role="alert"
        >
          {t("bookings.loadError", { error: loadError })}
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className="bookings-list-workspace flex flex-col gap-6">
          <FindBookingsCardHeader view={view} setView={setView} />
          <BookingsCalendarPanel
            filtered={filtered}
            totalBookingsCount={bookings.length}
            onSelectBooking={setSelectedBookingId}
            filters={{
              query,
              setQuery,
              filter,
              setFilter,
              paymentFilter,
              setPaymentFilter,
              audienceFilter,
              setAudienceFilter,
              dateFrom,
              setDateFrom,
              dateTo,
              setDateTo,
              onResetFilters: resetFilters,
              filterCounts,
            }}
          />
        </div>
      ) : null}

      {view === "list" ? (
        <>
          <div className="bookings-list-workspace flex flex-col gap-6">
            <FindBookingsCardHeader view={view} setView={setView} />

            <BookingsFiltersSection
              query={query}
              setQuery={setQuery}
              filter={filter}
              setFilter={setFilter}
              paymentFilter={paymentFilter}
              setPaymentFilter={setPaymentFilter}
              audienceFilter={audienceFilter}
              setAudienceFilter={setAudienceFilter}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              onResetFilters={resetFilters}
              filterCounts={filterCounts}
            />

            <div className={cardClass}>
            <div className={cn("grid grid-cols-12", APP_TABLE_HEAD_BAR)}>
              <div className={cn("col-span-12 sm:col-span-4", bookingsTableHeadClass)}>
                {t("bookings.tableCustomerEvent")}
              </div>
              <div
                className={cn(
                  "col-span-12 hidden sm:col-span-2 sm:block",
                  bookingsTableHeadClass,
                )}
              >
                {t("bookings.tableGuests")}
              </div>
              <div
                className={cn(
                  "col-span-12 hidden px-3 text-right sm:col-span-2 sm:block",
                  bookingsTableHeadClass,
                )}
              >
                {t("bookings.tableFinance")}
              </div>
              <div
                className={cn(
                  "col-span-12 hidden text-right sm:col-span-2 sm:block",
                  bookingsTableHeadClass,
                )}
              >
                {t("bookings.tableStatus")}
              </div>
              <div
                className={cn(
                  "col-span-12 hidden text-right sm:col-span-2 sm:block",
                  bookingsTableHeadClass,
                )}
              >
                {t("bookings.tableContract")}
              </div>
            </div>

            <div className="divide-y divide-foreground/6">
              {filtered.length === 0 ? (
                <div className="space-y-4 px-6 py-16 text-center sm:px-10 sm:py-20 md:px-8">
                  <p className="bookings-list-empty-title font-heading font-bold tracking-tight text-rn-text-heading">
                    {bookings.length === 0
                      ? t("bookings.emptyTitle")
                      : t("bookings.emptyFilteredTitle")}
                  </p>
                  <p className="bookings-list-empty-body mx-auto max-w-lg text-muted-foreground">
                    {bookings.length === 0
                      ? t("bookings.emptyDescription")
                      : t("bookings.emptyFilteredDescription")}
                  </p>
                </div>
              ) : (
                pageRows.map((row) => (
                  <div
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "grid w-full cursor-pointer grid-cols-12 items-center px-6 py-5 font-inherit text-foreground transition-colors sm:px-8 sm:py-6 md:py-6",
                      "hover:bg-rn-surface-row-hover",
                      "outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-inset",
                      row.dimmed && "opacity-60",
                    )}
                    aria-label={t("bookings.openDetailsAria", {
                      customer: row.customer,
                      phone: row.customerPhone?.trim()
                        ? `, ${row.customerPhone.trim()}`
                        : "",
                      festType: row.festType?.trim()
                        ? `, ${row.festType.trim()}`
                        : "",
                    })}
                    onClick={() => setSelectedBookingId(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedBookingId(row.id);
                      }
                    }}
                  >
                    <div className="col-span-12 flex items-center gap-4 sm:col-span-4">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-heading text-app-base font-semibold md:size-12 md:text-app-lg",
                          row.avatarClass,
                        )}
                      >
                        {row.initials}
                      </div>
                      <div>
                        <h4 className="bookings-list-row-title font-heading font-semibold text-foreground">
                          {row.customer}
                        </h4>
                        {row.customerPhone?.trim() ? (
                          <p className="bookings-list-row-meta mt-0.5 flex items-center gap-1.5 text-app-sm text-muted-foreground">
                            <Phone
                              className="size-3.5 shrink-0 text-rn-text-slate"
                              aria-hidden
                            />
                            <span className="tabular-nums">
                              {row.customerPhone.trim()}
                            </span>
                          </p>
                        ) : null}
                        <div className="bookings-list-row-meta mt-1 flex flex-wrap items-center gap-2">
                          <span className={APP_LIST_ROW_DATE}>{row.date}</span>
                          <span
                            className="size-1 shrink-0 rounded-full bg-border"
                            aria-hidden
                          />
                          <span className="font-semibold text-success">
                            {row.eventType}
                          </span>
                          {row.festType?.trim() ? (
                            <>
                              <span
                                className="size-1 shrink-0 rounded-full bg-border"
                                aria-hidden
                              />
                              <span className="font-medium text-foreground">
                                {row.festType.trim()}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12 mt-3 flex items-center gap-2 sm:col-span-2 sm:mt-0">
                      <Users className="size-6 shrink-0 text-muted-foreground md:size-7" aria-hidden />
                      <span className="bookings-list-row-metric font-semibold text-foreground">
                        {t("bookings.guestsCount", { count: row.guests })}
                      </span>
                    </div>
                    <div className="col-span-12 mt-3 text-left sm:col-span-2 sm:mt-0 sm:px-3 sm:text-right">
                      <div className="inline-block text-left sm:text-right">
                        <div className="bookings-list-row-amount font-bold tabular-nums text-foreground">
                          {formatCurrency(row.totalNok)}
                        </div>
                        {row.paidFraction !== null ? (
                          <div className="mt-1 flex flex-wrap items-center gap-2 sm:justify-end">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  row.paidFraction >= 1
                                    ? statusDotClass("success")
                                    : statusDotClass("warning"),
                                )}
                                style={{
                                  width: `${Math.round(row.paidFraction * 100)}%`,
                                }}
                              />
                            </div>
                            <span
                              className={cn(
                                "bookings-list-row-paid font-bold",
                                row.paidFraction >= 1
                                  ? statusTextClass("success")
                                  : statusTextClass("warning"),
                              )}
                            >
                              {row.paidLabel}
                            </span>
                          </div>
                        ) : (
                          <div className="bookings-list-row-paid mt-1 font-bold text-muted-foreground uppercase">
                            {row.paidLabel}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-6 mt-3 flex items-center sm:col-span-2 sm:mt-0 sm:justify-end">
                      <BookingStatusBadge
                        className="bookings-list-status-pill"
                        status={row.status}
                      />
                    </div>
                    <div className="col-span-6 mt-3 flex flex-col items-end justify-center gap-2 sm:col-span-2 sm:mt-0">
                      <BookingListContractAction
                        bookingId={row.id}
                        contract={row.contract}
                      />
                      <BookingListPortalAction
                        bookingId={row.id}
                        customer={row.customer}
                        state={row.portalState}
                        cancelled={Boolean(row.dimmed)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <ListPagination
  summaryClassName="bookings-list-footer-caption"
  summary={<>
                {bookings.length === 0
                  ? t("bookings.footer.noBookings")
                  : filtered.length === 0
                    ? t("bookings.footer.noRowsMatch", {
                        total: bookings.length,
                        bookingsLabel:
                          bookings.length === 1
                            ? t("bookings.footer.bookingWord")
                            : t("bookings.footer.bookingsWord"),
                      })
                    : filtered.length <= TENANT_LIST_PAGE_SIZE
                      ? t("bookings.footer.showingAll", {
                          shown: filtered.length,
                          total: bookings.length,
                        })
                      : t("bookings.footer.showingRange", {
                          from:
                            (currentPage - 1) * TENANT_LIST_PAGE_SIZE + 1,
                          to: Math.min(
                            currentPage * TENANT_LIST_PAGE_SIZE,
                            filtered.length,
                          ),
                          filtered: filtered.length,
                          extra:
                            filtered.length !== bookings.length
                              ? t("bookings.footer.extraMatches", {
                                  total: bookings.length,
                                })
                              : ` ${t("bookings.footer.bookingsWord")}`,
                        })}
              </>}
  page={currentPage}
  totalPages={totalPages}
  onPageChange={setPage}
/>
            </div>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
          <div className="flex min-w-0 flex-col justify-between rounded-2xl bg-success p-7 text-white md:p-9">
            <div className="min-w-0">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-white/12 md:size-14">
                <TrendingUp className="size-6 md:size-7" aria-hidden />
              </div>
              <h2 className="font-heading text-app-xl font-bold leading-snug text-white md:text-app-2xl">
                {t("bookings.stats.monthlyRevenue")}
              </h2>
              <p className="mt-3 text-app-sm leading-relaxed text-white/90 md:text-app-base">
                {t("bookings.stats.monthlyRevenueDesc", {
                  month: quickStats.monthLabel,
                  prevMonth: quickStats.prevMonthLabel,
                })}
              </p>
            </div>
            <div className="mt-10 min-w-0">
              <div className="break-words text-app-3xl font-black leading-none tracking-tight md:text-app-3xl [&_span:last-child]:text-app-lg [&_span:last-child]:font-semibold [&_span:last-child]:opacity-85 md:[&_span:last-child]:text-app-2xl">
                {formatNokCompact(quickStats.currentMonthRevenue, formatCurrency)}
              </div>
              {quickStats.monthOverMonthPct != null ? (
                <div
                  className={cn(
                    "mt-4 flex items-center gap-2 text-app-sm font-bold md:text-app-base",
                    trendPositive ? "text-emerald-200" : "text-rose-200",
                  )}
                >
                  {trendPositive ? (
                    <ArrowUpRight className="size-4 shrink-0 md:size-5" aria-hidden />
                  ) : (
                    <ArrowDownRight className="size-4 shrink-0 md:size-5" aria-hidden />
                  )}
                  <span>
                    {t("bookings.stats.percentFromPrevMonth", {
                      sign: trendPositive ? "+" : "",
                      percent: quickStats.monthOverMonthPct
                        .toFixed(1)
                        .replace(".", ","),
                    })}
                  </span>
                </div>
              ) : (
                <p className="mt-4 text-app-sm font-medium text-white/75 md:text-app-base">
                  {t("bookings.stats.noComparison")}
                </p>
              )}
              <p className="mt-3 text-app-sm text-white/70">
                {t("bookings.stats.prevMonthAmount", {
                  amount: formatCurrency(quickStats.prevMonthRevenue),
                })}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col gap-8 md:col-span-2 md:flex-row md:gap-10",
              "rounded-2xl bg-card p-7 ring-1 ring-foreground/8 md:p-9",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-xl bg-muted/50 p-5 md:p-6">
                  <p className="mb-3 text-app-sm font-semibold text-muted-foreground">
                    {t("bookings.stats.calendarCoverage")}
                  </p>
                  <p className="dashboard-kpi-value font-extrabold text-rn-text-heading tabular-nums md:text-app-3xl">
                    {quickStats.calendarFillPct}%
                  </p>
                  <p className="mt-3 text-app-base leading-snug text-muted-foreground md:text-app-lg">
                    {t("bookings.stats.calendarCoverageDesc")}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-5 md:p-6">
                  <p className="mb-3 text-app-sm font-semibold text-muted-foreground">
                    {t("bookings.stats.avgGuests")}
                  </p>
                  <p className="dashboard-kpi-value font-extrabold text-rn-text-heading tabular-nums md:text-app-3xl">
                    {quickStats.avgGuestsActive ?? "—"}
                  </p>
                  <p className="mt-3 text-app-base text-muted-foreground md:text-app-lg">
                    {t("bookings.stats.avgGuestsDesc")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col justify-between rounded-xl bg-muted/50 p-6 md:w-[38%] md:max-w-[340px] md:p-8">
              <div>
                <p className="text-app-sm font-semibold text-success dark:!text-white">
                  {t("bookings.stats.thisMonth")}
                </p>
                <p className="mt-3 dashboard-kpi-value text-success dark:!text-white md:text-app-3xl">
                  {formatCurrency(quickStats.currentMonthRevenue)}
                </p>
              </div>
              <div className="mt-8 space-y-3 border-t border-foreground/10 pt-5">
                <div className="flex justify-between text-app-base md:text-app-lg">
                  <span className="font-medium text-rn-text-body">
                    {t("bookings.stats.prevMonthLabel")}
                  </span>
                  <span className="font-bold tabular-nums text-rn-text-heading">
                    {formatCurrency(quickStats.prevMonthRevenue)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success transition-[width]"
                    style={{
                      width: (() => {
                        const { currentMonthRevenue: c, prevMonthRevenue: p } =
                          quickStats;
                        if (c + p === 0) return "0%";
                        const max = Math.max(c, p, 1);
                        return `${Math.min(100, Math.round((c / max) * 100))}%`;
                      })(),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
      </div>

      <ConfirmActionDialog
        open={pendingStatusConfirm != null}
        onOpenChange={(open) => {
          if (!open && updatingId == null) setPendingStatusConfirm(null);
        }}
        title={
          pendingStatusConfirm
            ? pendingStatusConfirm.next === "cancelled"
              ? t("bookings.confirmCancel")
              : pendingStatusConfirm.next === "pending"
                ? t("bookings.confirmPending")
                : t("bookings.confirmAction")
            : ""
        }
        description={pendingStatusConfirm?.message ?? ""}
        confirmLabel={
          pendingStatusConfirm?.next === "cancelled"
            ? t("bookings.confirmYesCancel")
            : t("common.actions.confirm")
        }
        busy={updatingId != null}
        busyLabel={t("bookings.saving")}
        contentClassName="z-[100]"
        confirmClassName={
          pendingStatusConfirm?.next === "cancelled"
            ? "border-2 border-red-200 bg-red-600 !text-white hover:bg-red-700"
            : "border-2 border-rn-accent-border bg-success !text-white hover:bg-rn-accent-fill-hover"
        }
        onConfirm={confirmPendingStatusChange}
      />

      {selectedRow ? (
        <BookingDetailSheet
          key={selectedRow.id}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setSelectedBookingId(null);
          }}
          row={selectedRow}
          updatingId={updatingId}
          onSetStatus={setBookingStatus}
          canDeleteBooking={canDeleteBookings}
        />
      ) : null}

      {canDeleteBookings ? (
        <Link
          href="/app/bookings/new"
          className="fixed bottom-8 right-8 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform active:scale-95 md:hidden"
          aria-label={t("bookings.new")}
        >
          <Plus className="size-7" />
        </Link>
      ) : null}
    </div>
  );
}
