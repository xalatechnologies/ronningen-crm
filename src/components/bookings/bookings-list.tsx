"use client";

import type {
  BookingListRow,
  BookingStatus,
  BookingsQuickStats,
} from "@/components/bookings/types";
import {
  BookingsMonthCalendar,
  BookingsMonthCalendarToolbar,
  useBookingsMonthCalendarNavigation,
} from "@/components/bookings/bookings-month-calendar";
import { BookingDetailSheet } from "@/components/bookings/booking-detail-sheet";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { BOOKING_PAYMENT_STATUS_LABELS } from "@/constants/booking-payment-status";
import { cn } from "@/lib/utils";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useSupabase } from "@/providers/supabase-provider";

import { RN_CARD_SHELL, RN_SEGMENT_CONTROL } from "@/lib/rn-ui";
import { eachBookingYmdInRange } from "@/lib/booking-period";

const bookingsTableHeadClass =
  "bookings-list-table-head font-semibold tracking-wider text-rn-text-column uppercase";

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

function formatNok(n: number) {
  return `${new Intl.NumberFormat("nb-NO").format(Math.round(n))} NOK`;
}

function formatNokCompact(n: number) {
  const formatted = new Intl.NumberFormat("nb-NO").format(Math.round(n));
  return (
    <>
      <span className="tracking-tight">{formatted}</span>{" "}
      <span className="text-lg font-medium tracking-normal opacity-70 md:text-2xl">NOK</span>
    </>
  );
}

function pctDelta(prev: number, curr: number): number | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function statusConfirmTitle(next: BookingStatus): string {
  switch (next) {
    case "cancelled":
      return "Avbestille booking?";
    case "pending":
      return "Flytte booking til avventer?";
    default:
      return "Bekreft handling";
  }
}

function computeQuickStats(rows: BookingListRow[]): BookingsQuickStats {
  const now = new Date();
  const y = now.getFullYear();
  const m0 = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const thisYm = `${y}-${pad(m0 + 1)}`;
  const prevD = new Date(y, m0 - 1, 1);
  const prevYm = `${prevD.getFullYear()}-${pad(prevD.getMonth() + 1)}`;

  const monthLabel = new Intl.DateTimeFormat("nb-NO", {
    month: "long",
    year: "numeric",
  }).format(now);
  const prevMonthLabel = new Intl.DateTimeFormat("nb-NO", {
    month: "long",
    year: "numeric",
  }).format(prevD);

  let currentMonthRevenue = 0;
  let prevMonthRevenue = 0;
  const daysWithEvents = new Set<string>();
  const daysInMonth = new Date(y, m0 + 1, 0).getDate();

  const active = rows.filter((r) => r.status !== "cancelled");
  let guestSum = 0;

  for (const r of active) {
    guestSum += r.guests;

    const ym = r.eventDateIso.slice(0, 7);
    if (ym === thisYm) {
      currentMonthRevenue += r.totalNok;
    }
    if (ym === prevYm) {
      prevMonthRevenue += r.totalNok;
    }
    for (const ymd of eachBookingYmdInRange(
      r.eventDateIso,
      r.eventEndDateIso,
    )) {
      if (ymd.slice(0, 7) === thisYm) {
        daysWithEvents.add(ymd);
      }
    }
  }

  const calendarFillPct =
    daysInMonth > 0
      ? Math.min(100, Math.round((daysWithEvents.size / daysInMonth) * 100))
      : 0;

  const avgGuestsActive =
    active.length > 0 ? Math.round(guestSum / active.length) : null;

  return {
    currentMonthRevenue,
    prevMonthRevenue,
    monthOverMonthPct: pctDelta(prevMonthRevenue, currentMonthRevenue),
    monthLabel,
    prevMonthLabel,
    calendarFillPct,
    avgGuestsActive,
  };
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
  const hasActiveFilters =
    query.trim() !== "" ||
    filter !== "all" ||
    paymentFilter !== "" ||
    audienceFilter !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  return (
    <section
      className="bookings-list-filters border-t border-rn-border-strong/35 px-6 py-5 md:px-8 md:py-6"
      aria-label="Søk og filtrer reservasjoner"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4">
          <div className="relative min-w-0 flex-1">
            <Label htmlFor="bookings-search" className={filterEyebrowClass}>
              Søk
            </Label>
            <Search
              className="pointer-events-none absolute top-[calc(50%+0.625rem)] left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
              aria-hidden
            />
            <Input
              id="bookings-search"
              aria-label="Søk blant reservasjoner"
              className="h-12 w-full rounded-md border-2 border-rn-border-strong bg-background pl-12 text-app-base text-foreground shadow-sm md:h-14 md:pl-14 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
              placeholder="Kunde, telefon, referanse eller type …"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="flex min-w-0 flex-col lg:flex-1 lg:items-end">
            <p className={cn(filterEyebrowClass, "w-full lg:text-right")}>Status</p>
            <div
              className="grid min-w-0 w-full grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:flex lg:flex-row lg:flex-wrap lg:items-stretch lg:justify-end lg:gap-2.5 xl:w-auto xl:flex-nowrap"
              role="group"
              aria-label="Filtrer etter status"
            >
              {(
                [
                  ["all", "Alle", filterCounts.all, null],
                  ["confirmed", "Bekreftet", filterCounts.confirmed, "emerald"],
                  ["pending", "Avventer", filterCounts.pending, "amber"],
                  ["cancelled", "Avbestilt", filterCounts.cancelled, "rose"],
                ] as const
              ).map(([key, label, count, tone]) => {
                const active = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-between gap-2 rounded-md border-2 px-3 py-3 text-left transition-all sm:gap-3 sm:px-4 md:min-h-[3.25rem] md:rounded-md md:px-5 md:py-3.5 lg:min-h-14 lg:w-auto lg:min-w-[7rem] lg:flex-1 lg:max-w-[10.5rem] xl:min-w-[7.5rem]",
                      active
                        ? "border-rn-accent-border bg-success !text-white shadow-md [&_svg]:!text-white"
                        : tone === "emerald"
                          ? "border-emerald-400/90 bg-white text-emerald-950 hover:border-emerald-500 hover:bg-emerald-50"
                          : tone === "amber"
                            ? "border-amber-400/90 bg-white text-amber-950 hover:border-amber-500 hover:bg-amber-50"
                            : tone === "rose"
                              ? "border-red-400/90 bg-white text-red-950 hover:border-red-500 hover:bg-red-50"
                              : "border-rn-border-strong bg-white text-foreground hover:border-rn-border-strong-hover hover:bg-rn-surface-wash",
                    )}
                  >
                    <span
                      className={cn(
                        "font-heading text-app-base font-semibold",
                        active ? "!text-white" : undefined,
                      )}
                    >
                      {label}
                    </span>
                    <span
                      className={cn(
                        "bookings-list-filter-count inline-flex min-w-[1.75rem] items-center justify-center rounded-md border px-2 py-0.5 text-app-sm font-bold tabular-nums md:text-app-base",
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

        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4",
            secondaryRowEnd && "xl:flex-nowrap xl:gap-3",
          )}
        >
          <div className="w-full shrink-0 sm:w-44 md:w-48">
            <Label htmlFor="bookings-date-from" className={filterEyebrowClass}>
              Fra dato
            </Label>
            <DatePickerField
              id="bookings-date-from"
              value={dateFrom}
              onChange={setDateFrom}
              maxYmd={dateTo || undefined}
              variant="toolbar"
              className="h-11 min-h-11 text-sm sm:h-12 sm:min-h-12 sm:text-base"
            />
          </div>
          <div className="w-full shrink-0 sm:w-44 md:w-48">
            <Label htmlFor="bookings-date-to" className={filterEyebrowClass}>
              Til dato
            </Label>
            <DatePickerField
              id="bookings-date-to"
              value={dateTo}
              onChange={setDateTo}
              minYmd={dateFrom || undefined}
              variant="toolbar"
              className="h-11 min-h-11 text-sm sm:h-12 sm:min-h-12 sm:text-base"
            />
          </div>
          <div className="w-full shrink-0 sm:w-52 md:w-56">
            <Label htmlFor="bookings-payment-filter" className={filterEyebrowClass}>
              Betaling
            </Label>
            <NativeSelect
              id="bookings-payment-filter"
              value={paymentFilter}
              onChange={(e) =>
                setPaymentFilter(e.target.value as BookingPaymentFilter)
              }
              aria-label="Filtrer etter betaling"
              className="h-11 min-h-11 text-sm sm:h-12 sm:min-h-12 sm:text-base"
            >
              <option value="">Alle betalinger</option>
              <option value="unpaid">{BOOKING_PAYMENT_STATUS_LABELS.unpaid}</option>
              <option value="partial">{BOOKING_PAYMENT_STATUS_LABELS.partial}</option>
              <option value="paid">{BOOKING_PAYMENT_STATUS_LABELS.paid}</option>
            </NativeSelect>
          </div>
          <div className="w-full shrink-0 sm:w-52 md:w-56">
            <Label htmlFor="bookings-audience-filter" className={filterEyebrowClass}>
              Arrangementstype
            </Label>
            <NativeSelect
              id="bookings-audience-filter"
              value={audienceFilter}
              onChange={(e) =>
                setAudienceFilter(e.target.value as BookingAudienceFilter)
              }
              aria-label="Filtrer etter arrangementstype"
              className="h-11 min-h-11 text-sm sm:h-12 sm:min-h-12 sm:text-base"
            >
              <option value="">Alle typer</option>
              <option value="Privat">Privat</option>
              <option value="Bedrift">Bedrift</option>
            </NativeSelect>
          </div>
          <div className="flex w-full shrink-0 sm:w-auto sm:self-end">
            <Button
              type="button"
              variant="outline"
              disabled={!hasActiveFilters}
              className="h-11 w-full gap-2 rounded-md border-2 border-rn-border-strong px-4 font-heading text-sm font-semibold sm:h-12 sm:w-auto sm:px-5 sm:text-base"
              onClick={onResetFilters}
            >
              <RotateCcw className="size-4 shrink-0" aria-hidden />
              Nullstill filter
            </Button>
          </div>
          {secondaryRowEnd ? (
            <div className="flex w-full shrink-0 flex-wrap items-end justify-end gap-2 border-t border-rn-border-strong/35 pt-3 xl:ml-auto xl:w-auto xl:border-t-0 xl:border-l xl:pl-4 xl:pt-0">
              {secondaryRowEnd}
            </div>
          ) : null}
        </div>
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
  return (
    <header className="border-b-2 border-rn-border-strong bg-card/80 px-6 py-5 md:px-8 md:py-6">
      <div className="bookings-list-hero">
        <AppPageHeader
          className="mb-0"
          surface="default"
          title="Reservasjoner"
          actions={
          <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
            <div
              className={RN_SEGMENT_CONTROL}
              role="tablist"
              aria-label="Bytt visning"
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
                    : "text-rn-text-body hover:border-rn-badge-border hover:bg-white",
                )}
              >
                <List className="size-5 shrink-0 opacity-90" aria-hidden />
                Liste
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
                    : "text-rn-text-body hover:border-rn-badge-border hover:bg-white",
                )}
              >
                <CalendarDays className="size-5 shrink-0 opacity-90" aria-hidden />
                Kalender
              </button>
            </div>
            <Link
              href="/app/bookings/new"
              className={cn(buttonVariants({ variant: "success", size: "cta" }))}
            >
              <Plus className="size-5" aria-hidden />
              Ny reservasjon
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
  const supabase = useSupabase();
  const router = useRouter();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BookingStatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<BookingPaymentFilter>("");
  const [audienceFilter, setAudienceFilter] = useState<BookingAudienceFilter>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function resetFilters() {
    setQuery("");
    setFilter("all");
    setPaymentFilter("");
    setAudienceFilter("");
    setDateFrom("");
    setDateTo("");
  }

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
        toast.error("Kunne ikke oppdatere status", {
          description: error.message,
        });
        return;
      }

      toast.success(
        next === "confirmed"
          ? "Booking bekreftet"
          : next === "cancelled"
            ? "Booking avbestilt"
            : "Booking satt til avventer",
      );
      router.refresh();
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

  const quickStats = useMemo(() => computeQuickStats(bookings), [bookings]);

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

  const trendPositive =
    quickStats.monthOverMonthPct != null &&
    quickStats.monthOverMonthPct >= 0;

  return (
    <div className="flex w-full flex-col gap-8 pb-24 md:pb-10">
      {loadError ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          Kunne ikke laste bookinger: {loadError}
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
                Kunde &amp; arrangement
              </div>
              <div
                className={cn(
                  "col-span-12 hidden sm:col-span-2 sm:block",
                  bookingsTableHeadClass,
                  "py-0",
                )}
              >
                Gjester
              </div>
              <div
                className={cn(
                  "col-span-12 hidden px-4 text-right sm:col-span-4 sm:block",
                  bookingsTableHeadClass,
                  "py-0",
                )}
              >
                Økonomi
              </div>
              <div
                className={cn(
                  "col-span-12 hidden text-right sm:col-span-2 sm:block",
                  bookingsTableHeadClass,
                  "py-0",
                )}
              >
                Status · detaljer
              </div>
            </div>

            <div className="divide-y divide-rn-border-strong/50">
              {filtered.length === 0 ? (
                <div className="space-y-4 px-6 py-16 text-center sm:px-10 sm:py-20 md:px-8">
                  <p className="bookings-list-empty-title font-heading font-bold tracking-tight text-rn-text-heading">
                    {bookings.length === 0
                      ? "Ingen bookinger ennå"
                      : "Ingen treff i listen"}
                  </p>
                  <p className="bookings-list-empty-body mx-auto max-w-lg text-muted-foreground">
                    {bookings.length === 0
                      ? "Opprett en ny reservasjon for å se den her. Du kan også importere eller legge til kunder fra Kunder."
                      : "Juster søket eller bytt filter (Alle, Bekreftet, …). Nullstill ved å velge «Alle» og tømme søkefeltet."}
                  </p>
                </div>
              ) : (
                filtered.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={cn(
                      "grid w-full grid-cols-12 items-center px-6 py-5 text-left font-inherit text-foreground transition-colors sm:px-8 sm:py-6 md:py-6",
                      "cursor-pointer border-0 outline-none hover:bg-rn-surface-row-hover focus-visible:bg-rn-surface-row-hover focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2",
                      row.dimmed && "opacity-60",
                    )}
                    aria-label={`Åpne bookingdetaljer for ${row.customer}${row.customerPhone?.trim() ? `, ${row.customerPhone.trim()}` : ""}${row.festType?.trim() ? `, ${row.festType.trim()}` : ""}`}
                    onClick={() => setSelectedBookingId(row.id)}
                  >
                    <div className="col-span-12 flex items-center gap-4 sm:col-span-4">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-heading text-base font-semibold md:size-12 md:text-app-lg",
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
                          <p className="bookings-list-row-meta mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone
                              className="size-3.5 shrink-0 text-rn-text-slate"
                              aria-hidden
                            />
                            <span className="tabular-nums">
                              {row.customerPhone.trim()}
                            </span>
                          </p>
                        ) : null}
                        <div className="bookings-list-row-meta mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                          <span>{row.date}</span>
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
                        {row.guests} gjester
                      </span>
                    </div>
                    <div className="col-span-12 mt-3 text-left sm:col-span-4 sm:mt-0 sm:px-4 sm:text-right">
                      <div className="inline-block text-left sm:text-right">
                        <div className="bookings-list-row-amount font-bold tabular-nums text-foreground">
                          {formatNok(row.totalNok)}
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
                  ? "Ingen bookinger"
                  : filtered.length === 0
                    ? `Ingen rader samsvarer med filteret · ${bookings.length} ${bookings.length === 1 ? "booking" : "bookinger"} totalt`
                    : `Viser 1–${filtered.length} av ${bookings.length} bookinger`}
              </span>
              {bookings.length > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
                  disabled
                  aria-label="Forrige side"
                >
                  <ChevronLeft className="size-[18px]" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  className="size-10 rounded-md border-2 border-success bg-success text-primary-foreground"
                >
                  1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
                  disabled
                  aria-label="Neste side"
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
              <h2 className="font-heading text-xl font-bold leading-snug text-white md:text-2xl">
                Månedlig omsetning
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/90 md:text-base">
                Fakturert på bookinger i{" "}
                <span className="font-semibold text-white">
                  {quickStats.monthLabel}
                </span>
                . Sammenlignes med {quickStats.prevMonthLabel}.
              </p>
            </div>
            <div className="mt-10 min-w-0">
              <div className="break-words text-4xl font-black leading-none tracking-tight md:text-5xl [&_span:last-child]:text-lg [&_span:last-child]:font-semibold [&_span:last-child]:opacity-85 md:[&_span:last-child]:text-2xl">
                {formatNokCompact(quickStats.currentMonthRevenue)}
              </div>
              {quickStats.monthOverMonthPct != null ? (
                <div
                  className={cn(
                    "mt-4 flex items-center gap-2 text-sm font-bold md:text-base",
                    trendPositive ? "text-emerald-200" : "text-rose-200",
                  )}
                >
                  {trendPositive ? (
                    <ArrowUpRight className="size-4 shrink-0 md:size-5" aria-hidden />
                  ) : (
                    <ArrowDownRight className="size-4 shrink-0 md:size-5" aria-hidden />
                  )}
                  <span>
                    {trendPositive ? "+" : ""}
                    {quickStats.monthOverMonthPct
                      .toFixed(1)
                      .replace(".", ",")}
                    % fra forrige måned
                  </span>
                </div>
              ) : (
                <p className="mt-4 text-sm font-medium text-white/75 md:text-base">
                  Ingen sammenligning mot forrige måned (manglende grunnlag).
                </p>
              )}
              <p className="mt-3 text-sm text-white/70">
                Forrige måned: {formatNok(quickStats.prevMonthRevenue)}
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
                  <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-sm">
                    Kalenderdekning
                  </p>
                  <p className="font-heading text-3xl font-extrabold text-rn-text-heading tabular-nums md:text-4xl">
                    {quickStats.calendarFillPct}%
                  </p>
                  <p className="mt-3 text-base leading-snug text-muted-foreground md:text-lg">
                    Av dager i måneden med minst ett arrangement.
                  </p>
                </div>
                <div className="rounded-md border-2 border-rn-border-strong bg-rn-surface-segment p-5 md:p-6">
                  <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-sm">
                    Snitt gjester
                  </p>
                  <p className="font-heading text-3xl font-extrabold text-rn-text-heading tabular-nums md:text-4xl">
                    {quickStats.avgGuestsActive ?? "—"}
                  </p>
                  <p className="mt-3 text-base text-muted-foreground md:text-lg">
                    Per booking.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col justify-between rounded-md border-2 border-success/50 bg-gradient-to-b from-rn-surface-gradient-from to-muted p-6 md:w-[38%] md:max-w-[340px] md:p-8">
              <div>
                <p className="text-xs font-semibold tracking-wider text-success uppercase md:text-sm">
                  Denne måneden
                </p>
                <p className="mt-3 font-heading text-4xl font-bold text-success md:text-5xl">
                  {formatNok(quickStats.currentMonthRevenue)}
                </p>
              </div>
              <div className="mt-8 space-y-3 border-t-2 border-success/20 pt-5">
                <div className="flex justify-between text-base md:text-lg">
                  <span className="font-medium text-rn-text-body">
                    Forrige måned
                  </span>
                  <span className="font-bold tabular-nums text-rn-text-heading">
                    {formatNok(quickStats.prevMonthRevenue)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-rn-border-strong/40 bg-white">
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

      <Dialog
        open={pendingStatusConfirm != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingStatusConfirm(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="z-[100] max-w-[calc(100%-2rem)] gap-4 rounded-md border-2 border-rn-border-strong bg-card p-6 shadow-xl sm:max-w-md"
        >
          {pendingStatusConfirm ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading">
                  {statusConfirmTitle(pendingStatusConfirm.next)}
                </DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-muted-foreground">
                  {pendingStatusConfirm.message}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="cta"
                  className="w-full border-2 border-rn-border-strong sm:w-auto"
                  onClick={() => setPendingStatusConfirm(null)}
                >
                  Avbryt
                </Button>
                <Button
                  type="button"
                  disabled={updatingId != null}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "h-11 w-full rounded-md border-2 border-red-200 bg-red-600 font-semibold text-white hover:bg-red-700 sm:w-auto",
                  )}
                  onClick={() => void confirmPendingStatusChange()}
                >
                  {pendingStatusConfirm.next === "cancelled"
                    ? "Ja, avbestill"
                    : "Bekreft"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

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
        aria-label="Ny reservasjon"
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
