"use client";

import type {
  BookingListRow,
  BookingStatus,
} from "@/components/bookings/types";
import {
  BookingsMonthCalendar,
  BookingsMonthCalendarToolbar,
  useBookingsMonthCalendarNavigation,
} from "@/components/bookings/bookings-month-calendar";
import { BookingDetailSheet } from "@/components/bookings/booking-detail-sheet";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { BOOKING_PAYMENT_STATUS_VALUES, bookingPaymentStatusLabel } from "@/constants/booking-payment-status";
import { useTranslation } from "@/i18n/client";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { cn } from "@/lib/utils";
import { APP_LIST_ROW_DATE } from "@/lib/table-typography";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Phone,
  Plus,
  RotateCcw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useSupabase } from "@/providers/supabase-provider";

import { RN_CARD_SHELL, RN_SEGMENT_CONTROL } from "@/lib/rn-ui";
import { computeBookingsQuickStats } from "@/lib/bookings/quick-stats";

const bookingsTableHeadClass =
  "bookings-list-table-head font-semibold tracking-wider text-rn-text-column uppercase";

import { TENANT_LIST_PAGE_SIZE } from "@/lib/list-pagination";

const filterEyebrowClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

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
      className="bookings-list-filters border-t border-rn-border-strong/35 px-4 py-5 sm:px-6 md:px-8 md:py-6"
      aria-label={t("bookings.searchFilterAria")}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:gap-5">
          <div className="relative min-w-0 w-full xl:max-w-md 2xl:max-w-xl">
            <Label htmlFor="bookings-search" className={filterEyebrowClass}>
              {t("bookings.search")}
            </Label>
            <Search
              className="pointer-events-none absolute top-[calc(50%+0.625rem)] left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
              aria-hidden
            />
            <Input
              id="bookings-search"
              aria-label={t("bookings.searchAria")}
              className="h-12 w-full rounded-md border-2 border-rn-border-strong bg-background pl-12 text-app-base text-foreground shadow-sm md:h-14 md:pl-14 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
              placeholder={t("bookings.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="min-w-0 w-full flex-1">
            <p className={filterEyebrowClass}>{t("common.fields.status")}</p>
            <div
              className="grid min-w-0 w-full grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3"
              role="group"
              aria-label={t("bookings.filterStatusAria")}
            >
              {(
                [
                  ["all", t("common.actions.all"), filterCounts.all, null],
                  ["confirmed", statusLabel("confirmed", t), filterCounts.confirmed, "emerald"],
                  ["pending", statusLabel("pending", t), filterCounts.pending, "amber"],
                  ["cancelled", statusLabel("cancelled", t), filterCounts.cancelled, "rose"],
                ] as const
              ).map(([key, label, count, tone]) => {
                const active = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      "flex min-h-12 w-full min-w-0 items-center justify-between gap-2 rounded-md border-2 px-3 py-3 text-left transition-all sm:gap-3 sm:px-4 md:min-h-[3.25rem] md:rounded-md md:px-4 md:py-3.5",
                      active
                        ? "border-rn-accent-border bg-success !text-white shadow-md [&_svg]:!text-white"
                        : tone === "emerald"
                          ? "border-emerald-400/90 bg-card text-emerald-950 hover:border-emerald-500 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
                          : tone === "amber"
                            ? "border-amber-400/90 bg-card text-amber-950 hover:border-amber-500 hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-amber-950/40"
                            : tone === "rose"
                              ? "border-red-400/90 bg-card text-red-950 hover:border-red-500 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-950/40"
                              : "border-rn-border-strong bg-card text-foreground hover:border-rn-border-strong-hover hover:bg-rn-surface-wash",
                    )}
                  >
                    <span
                      className={cn(
                        "truncate font-heading text-app-sm font-semibold sm:text-app-base",
                        active ? "!text-white" : undefined,
                      )}
                    >
                      {label}
                    </span>
                    <span
                      className={cn(
                        "bookings-list-filter-count inline-flex shrink-0 min-w-[1.75rem] items-center justify-center rounded-md border px-2 py-0.5 text-app-sm font-bold tabular-nums",
                        active
                          ? "border-white/30 bg-white/20 !text-white"
                          : "border-rn-badge-border bg-rn-badge-surface text-rn-text-ink",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
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
              className="h-11 min-h-11 w-full min-w-0 text-app-sm sm:h-12 sm:min-h-12 sm:text-app-base"
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
              className="h-11 min-h-11 w-full min-w-0 text-app-sm sm:h-12 sm:min-h-12 sm:text-app-base"
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
              className="h-11 min-h-11 w-full min-w-0 text-app-sm sm:h-12 sm:min-h-12 sm:text-app-base"
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
              className="h-11 min-h-11 w-full min-w-0 text-app-sm sm:h-12 sm:min-h-12 sm:text-app-base"
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
              className="h-11 w-full min-w-0 gap-2 rounded-md border-2 border-rn-border-strong px-4 font-heading text-app-sm font-semibold sm:h-12 sm:text-app-base xl:w-auto xl:min-w-[11.5rem]"
              onClick={onResetFilters}
            >
              <RotateCcw className="size-4 shrink-0" aria-hidden />
              {t("bookings.resetFilters")}
            </Button>
          </div>
        </div>

        {secondaryRowEnd ? (
          <div className="flex min-w-0 flex-wrap items-end justify-end gap-2 border-t border-rn-border-strong/35 pt-3">
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
      <BookingsMonthCalendar
        rows={filtered}
        totalBookingsCount={totalBookingsCount}
        onSelectBooking={onSelectBooking}
        navigation={navigation}
        hideToolbar
      />
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
  return (
    <header className="border-b-2 border-rn-border-strong bg-card/80 px-6 py-5 md:px-8 md:py-6">
      <div className="bookings-list-hero">
        <AppPageHeader
          className="mb-0"
          surface="default"
          title={t("bookings.title")}
          actions={
          <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
            <div
              className={RN_SEGMENT_CONTROL}
              role="tablist"
              aria-label={t("bookings.switchViewAria")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === "list"}
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-transparent px-5 py-2.5 text-app-sm font-semibold transition-all outline-none select-none md:min-h-12 md:px-6 md:text-app-base",
                  "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2",
                  view === "list"
                    ? "border-rn-accent-border bg-success !text-white shadow-md [&_svg]:!text-white"
                    : "text-rn-text-body hover:border-rn-badge-border hover:bg-card",
                )}
              >
                <List className="size-5 shrink-0 opacity-90" aria-hidden />
                {t("bookings.list")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "calendar"}
                onClick={() => setView("calendar")}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-transparent px-5 py-2.5 text-app-sm font-semibold transition-all outline-none select-none md:min-h-12 md:px-6 md:text-app-base",
                  "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2",
                  view === "calendar"
                    ? "border-rn-accent-border bg-success !text-white shadow-md [&_svg]:!text-white"
                    : "text-rn-text-body hover:border-rn-badge-border hover:bg-card",
                )}
              >
                <CalendarDays className="size-5 shrink-0 opacity-90" aria-hidden />
                {t("bookings.calendar")}
              </button>
            </div>
            <Link
              href="/app/bookings/new"
              className={cn(buttonVariants({ variant: "success", size: "cta" }))}
            >
              <Plus className="size-5" aria-hidden />
              {t("bookings.new")}
            </Link>
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
  const [query, setQuery] = useState("");
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
          description: error.message,
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
    return rows;
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
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-app-sm text-destructive md:text-app-base"
          role="alert"
        >
          {t("bookings.loadError", { error: loadError })}
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className={cn("bookings-list-workspace overflow-hidden", RN_CARD_SHELL)}>
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
          <div className={cn("bookings-list-workspace overflow-hidden", RN_CARD_SHELL)}>
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

            <div className="grid grid-cols-12 border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head px-6 py-4 sm:px-8 sm:py-5">
              <div
                className={cn(
                  "col-span-12 sm:col-span-4",
                  bookingsTableHeadClass,
                  "py-0",
                )}
              >
                {t("bookings.tableCustomerEvent")}
              </div>
              <div
                className={cn(
                  "col-span-12 hidden sm:col-span-2 sm:block",
                  bookingsTableHeadClass,
                  "py-0",
                )}
              >
                {t("bookings.tableGuests")}
              </div>
              <div
                className={cn(
                  "col-span-12 hidden px-4 text-right sm:col-span-4 sm:block",
                  bookingsTableHeadClass,
                  "py-0",
                )}
              >
                {t("bookings.tableFinance")}
              </div>
              <div
                className={cn(
                  "col-span-12 hidden text-right sm:col-span-2 sm:block",
                  bookingsTableHeadClass,
                  "py-0",
                )}
              >
                {t("bookings.tableStatusDetails")}
              </div>
            </div>

            <div className="divide-y divide-rn-border-strong/50">
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
                  <button
                    key={row.id}
                    type="button"
                    className={cn(
                      "grid w-full grid-cols-12 items-center px-6 py-5 text-left font-inherit text-foreground transition-colors sm:px-8 sm:py-6 md:py-6",
                      "cursor-pointer border-0 outline-none hover:bg-rn-surface-row-hover focus-visible:bg-rn-surface-row-hover focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2",
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
                    <div className="col-span-12 mt-3 text-left sm:col-span-4 sm:mt-0 sm:px-4 sm:text-right">
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
                                    ? "bg-emerald-600"
                                    : "bg-amber-500",
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
                                  ? "text-emerald-700"
                                  : "text-amber-600",
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
                    <div className="col-span-12 mt-3 flex items-center justify-between gap-2 sm:col-span-2 sm:mt-0 sm:justify-end">
                      <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
                        <BookingStatusBadge
                          className="bookings-list-status-pill"
                          status={row.status}
                        />
                      </div>
                      <ChevronRight
                        className="size-6 shrink-0 text-muted-foreground md:size-7"
                        aria-hidden
                      />
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex flex-col items-stretch justify-between gap-4 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 sm:flex-row sm:items-center sm:px-8 md:py-6">
              <span className="bookings-list-footer-caption font-medium text-rn-footer-text">
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
              </span>
              {filtered.length > TENANT_LIST_PAGE_SIZE ? (
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="size-[18px]" />
                </Button>
              </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
          <div className="flex min-w-0 flex-col justify-between rounded-md border-2 border-rn-accent-border bg-success p-7 text-white shadow-rn-hero-success md:p-9">
            <div className="min-w-0">
              <div className="mb-5 flex size-12 items-center justify-center rounded-md border border-white/20 bg-white/12 md:size-14">
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
              RN_CARD_SHELL,
              "p-7 md:p-9",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-md border-2 border-rn-border-strong bg-rn-surface-segment p-5 md:p-6">
                  <p className="mb-3 text-app-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-app-sm">
                    {t("bookings.stats.calendarCoverage")}
                  </p>
                  <p className="dashboard-kpi-value font-extrabold text-rn-text-heading tabular-nums md:text-app-3xl">
                    {quickStats.calendarFillPct}%
                  </p>
                  <p className="mt-3 text-app-base leading-snug text-muted-foreground md:text-app-lg">
                    {t("bookings.stats.calendarCoverageDesc")}
                  </p>
                </div>
                <div className="rounded-md border-2 border-rn-border-strong bg-rn-surface-segment p-5 md:p-6">
                  <p className="mb-3 text-app-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-app-sm">
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
            <div className="flex w-full flex-col justify-between rounded-md border-2 border-success/50 bg-gradient-to-b from-rn-surface-gradient-from to-muted p-6 md:w-[38%] md:max-w-[340px] md:p-8">
              <div>
                <p className="text-app-xs font-semibold tracking-wider text-success uppercase dark:!text-white md:text-app-sm">
                  {t("bookings.stats.thisMonth")}
                </p>
                <p className="mt-3 dashboard-kpi-value text-success dark:!text-white md:text-app-3xl">
                  {formatCurrency(quickStats.currentMonthRevenue)}
                </p>
              </div>
              <div className="mt-8 space-y-3 border-t-2 border-success/20 pt-5">
                <div className="flex justify-between text-app-base md:text-app-lg">
                  <span className="font-medium text-rn-text-body">
                    {t("bookings.stats.prevMonthLabel")}
                  </span>
                  <span className="font-bold tabular-nums text-rn-text-heading">
                    {formatCurrency(quickStats.prevMonthRevenue)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-rn-border-strong/40 bg-muted">
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

      <Link
        href="/app/bookings/new"
        className="fixed bottom-8 right-8 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform active:scale-95 md:hidden"
        aria-label={t("bookings.new")}
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
