"use client";

import type {
  BookingListRow,
  BookingStatus,
  BookingsQuickStats,
} from "@/components/bookings/types";
import { BookingDetailSheet } from "@/components/bookings/booking-detail-sheet";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

import { useSupabase } from "@/providers/supabase-provider";

import { RN_CARD_SHELL, RN_SEGMENT_CONTROL } from "@/lib/rn-ui";

const bookingsTableHeadClass =
  "text-sm font-semibold tracking-wider text-rn-text-column uppercase md:text-base";

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
      daysWithEvents.add(r.eventDateIso);
    }
    if (ym === prevYm) {
      prevMonthRevenue += r.totalNok;
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

function FindBookingsCardHeader({
  view,
  setView,
}: {
  view: "list" | "calendar";
  setView: (v: "list" | "calendar") => void;
}) {
  return (
    <header className="border-b-2 border-rn-border-strong bg-card/80 px-6 py-5 md:px-8 md:py-6">
      <AppPageHeader
        className="mb-0"
        title="Bookinger"
        description="Administrer arrangementer, betaling og status — liste og kalender."
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
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-transparent px-5 py-2.5 text-[15px] font-semibold transition-all outline-none select-none md:min-h-12 md:px-6 md:text-base",
                  "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2",
                  view === "list"
                    ? "border-rn-accent-border bg-success text-white shadow-md"
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
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-transparent px-5 py-2.5 text-[15px] font-semibold transition-all outline-none select-none md:min-h-12 md:px-6 md:text-base",
                  "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2",
                  view === "calendar"
                    ? "border-rn-accent-border bg-success text-white shadow-md"
                    : "text-rn-text-body hover:border-rn-badge-border hover:bg-white",
                )}
              >
                <CalendarDays className="size-5 shrink-0 opacity-90" aria-hidden />
                Kalender
              </button>
            </div>
            <Link
              href="/app/bookings/new"
              className={cn(
                buttonVariants({ variant: "default" }),
                "inline-flex h-12 items-center gap-2 rounded-xl border-2 border-rn-accent-border bg-success px-6 font-heading text-base font-bold text-white shadow-md hover:bg-rn-accent-fill-hover",
              )}
            >
              <Plus className="size-5" aria-hidden />
              Ny booking
            </Link>
          </div>
        }
      />
    </header>
  );
}

export type BookingsListProps = {
  bookings: BookingListRow[];
  loadError: string | null;
};

export function BookingsList({ bookings, loadError }: BookingsListProps) {
  const supabase = useSupabase();
  const router = useRouter();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "confirmed" | "pending" | "cancelled"
  >("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );

  const selectedRow = useMemo(
    () =>
      selectedBookingId
        ? (bookings.find((b) => b.id === selectedBookingId) ?? null)
        : null,
    [bookings, selectedBookingId],
  );

  useEffect(() => {
    if (
      selectedBookingId &&
      !bookings.some((b) => b.id === selectedBookingId)
    ) {
      setSelectedBookingId(null);
    }
  }, [selectedBookingId, bookings]);

  async function setBookingStatus(
    id: string,
    next: BookingStatus,
    opts?: { confirmMessage?: string },
  ) {
    if (opts?.confirmMessage && !window.confirm(opts.confirmMessage)) return;

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
      rows = rows.filter(
        (r) =>
          r.customer.toLowerCase().includes(q) ||
          r.eventType.toLowerCase().includes(q),
      );
    }
    if (filter === "confirmed") {
      rows = rows.filter((r) => r.status === "confirmed");
    } else if (filter === "pending") {
      rows = rows.filter((r) => r.status === "pending");
    } else if (filter === "cancelled") {
      rows = rows.filter((r) => r.status === "cancelled");
    }
    return rows;
  }, [bookings, query, filter]);

  const trendPositive =
    quickStats.monthOverMonthPct != null &&
    quickStats.monthOverMonthPct >= 0;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pb-24 md:pb-10">
      {loadError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          Kunne ikke laste bookinger: {loadError}
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
          <FindBookingsCardHeader view={view} setView={setView} />
          <div className="flex min-h-[360px] items-center justify-center px-6 py-14 md:px-8">
            <p className="max-w-md text-center text-base leading-relaxed font-medium text-muted-foreground md:text-lg">
              Kalendervisning kommer. Bytt til liste for oversikt.
            </p>
          </div>
        </div>
      ) : null}

      {view === "list" ? (
        <>
          <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
            <FindBookingsCardHeader view={view} setView={setView} />

            <section
              className="border-t border-rn-border-strong/35 px-6 py-5 md:px-8 md:py-6"
              aria-label="Søk og filtrer bookinger"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
                    aria-hidden
                  />
                  <Input
                    id="bookings-search"
                    aria-label="Søk blant bookinger etter kunde eller arrangementstype"
                    className="h-12 w-full rounded-2xl border-2 border-rn-border-strong bg-background pl-12 text-base text-foreground shadow-sm md:h-14 md:pl-14 md:text-[17px] focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                    placeholder="Kunde eller arrangementstype…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div
                  className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:flex lg:flex-1 lg:flex-row lg:flex-wrap lg:items-stretch lg:justify-end lg:gap-2.5 xl:flex-nowrap"
                  role="group"
                  aria-label="Filtrer bookinger etter status"
                >
                    {(
                      [
                        ["all", "Alle", filterCounts.all, null],
                        [
                          "confirmed",
                          "Bekreftet",
                          filterCounts.confirmed,
                          "emerald",
                        ],
                        ["pending", "Avventer", filterCounts.pending, "amber"],
                        [
                          "cancelled",
                          "Avbestilt",
                          filterCounts.cancelled,
                          "rose",
                        ],
                      ] as const
                    ).map(([key, label, count, tone]) => {
                      const active = filter === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFilter(key)}
                          className={cn(
                            "flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all sm:gap-3 sm:px-4 md:min-h-[3.25rem] md:rounded-2xl md:px-5 md:py-3.5 lg:min-h-14 lg:w-auto lg:min-w-[7rem] lg:flex-1 lg:max-w-[10.5rem] xl:min-w-[7.5rem]",
                            active
                              ? "border-rn-accent-border bg-success text-white shadow-md"
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
                              "font-heading text-base font-semibold md:text-lg",
                              active ? "text-white" : undefined,
                            )}
                          >
                            {label}
                          </span>
                          <span
                            className={cn(
                              "inline-flex min-w-[1.75rem] items-center justify-center rounded-md border px-2 py-0.5 text-sm font-bold tabular-nums md:text-base",
                              active
                                ? "border-white/30 bg-white/20 text-white"
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
            </section>
          </div>

          <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
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
                  <p className="font-heading text-xl font-bold tracking-tight text-rn-text-heading md:text-2xl">
                    {bookings.length === 0
                      ? "Ingen bookinger ennå"
                      : "Ingen treff i listen"}
                  </p>
                  <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                    {bookings.length === 0
                      ? "Opprett en ny booking for å se den her. Du kan også importere eller legge til kunder fra Kunder."
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
                    aria-label={`Åpne bookingdetaljer for ${row.customer}`}
                    onClick={() => setSelectedBookingId(row.id)}
                  >
                    <div className="col-span-12 flex items-center gap-4 sm:col-span-4">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-heading text-sm font-semibold md:size-11 md:text-base",
                          row.avatarClass,
                        )}
                      >
                        {row.initials}
                      </div>
                      <div>
                        <h4 className="font-heading text-base font-semibold text-foreground md:text-lg">
                          {row.customer}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground md:text-base">
                          <span>{row.date}</span>
                          <span className="size-1 rounded-full bg-border" />
                          <span className="font-semibold text-success">
                            {row.eventType}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12 mt-3 flex items-center gap-2 sm:col-span-2 sm:mt-0">
                      <Users className="size-5 shrink-0 text-muted-foreground md:size-6" aria-hidden />
                      <span className="text-base font-semibold text-foreground md:text-lg">
                        {row.guests} gjester
                      </span>
                    </div>
                    <div className="col-span-12 mt-3 text-left sm:col-span-4 sm:mt-0 sm:px-4 sm:text-right">
                      <div className="inline-block text-left sm:text-right">
                        <div className="text-base font-bold tabular-nums text-foreground md:text-lg">
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
                                "text-xs font-bold md:text-sm",
                                row.paidFraction >= 1
                                  ? "text-emerald-700"
                                  : "text-amber-600",
                              )}
                            >
                              {row.paidLabel}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs font-bold text-muted-foreground uppercase md:text-sm">
                            {row.paidLabel}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-12 mt-3 flex items-center justify-between gap-2 sm:col-span-2 sm:mt-0 sm:justify-end">
                      <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
                        <BookingStatusBadge status={row.status} />
                      </div>
                      <ChevronRight
                        className="size-5 shrink-0 text-muted-foreground md:size-6"
                        aria-hidden
                      />
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex flex-col items-stretch justify-between gap-4 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 sm:flex-row sm:items-center sm:px-8 md:py-6">
              <span className="text-base font-medium text-rn-footer-text md:text-lg">
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
                  className="size-10 rounded-xl border-2 border-rn-border-strong bg-background"
                  disabled
                  aria-label="Forrige side"
                >
                  <ChevronLeft className="size-[18px]" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  className="size-10 rounded-xl border-2 border-success bg-success text-primary-foreground"
                >
                  1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="size-10 rounded-xl border-2 border-rn-border-strong bg-background"
                  disabled
                  aria-label="Neste side"
                >
                  <ChevronRight className="size-[18px]" />
                </Button>
              </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
            <div className="flex min-w-0 flex-col justify-between rounded-2xl border-2 border-rn-accent-border bg-success p-7 text-white shadow-rn-hero-success md:p-9">
              <div className="min-w-0">
                <div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-white/20 bg-white/12 md:size-14">
                  <TrendingUp className="size-6 md:size-7" aria-hidden />
                </div>
                <h2 className="font-heading text-xl font-bold leading-snug md:text-2xl">
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
                <h2 className="mb-2 font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
                  Hurtigstatistikk
                </h2>
                <p className="mb-6 text-base leading-relaxed text-muted-foreground md:text-lg">
                  Basert på aktive bookinger (ikke avbestilt). Statusfordeling
                  (bekreftet, avventer) ser du i filtrene over listen.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                  <div className="rounded-xl border-2 border-rn-border-strong bg-rn-surface-segment p-5 md:p-6">
                    <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Kalenderdekning
                    </p>
                    <p className="font-heading text-2xl font-extrabold text-rn-text-heading tabular-nums md:text-3xl">
                      {quickStats.calendarFillPct}%
                    </p>
                    <p className="mt-3 text-sm leading-snug text-muted-foreground md:text-base">
                      Av dager i måneden med minst ett arrangement.
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-rn-border-strong bg-rn-surface-segment p-5 md:p-6">
                    <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Snitt gjester
                    </p>
                    <p className="font-heading text-2xl font-extrabold text-rn-text-heading tabular-nums md:text-3xl">
                      {quickStats.avgGuestsActive ?? "—"}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground md:text-base">
                      Per booking.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col justify-between rounded-xl border-2 border-success/50 bg-gradient-to-b from-rn-surface-gradient-from to-muted p-6 md:w-[38%] md:max-w-[340px] md:p-8">
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-success uppercase md:text-xs">
                    Denne måneden
                  </p>
                  <p className="mt-3 font-heading text-3xl font-bold text-success md:text-4xl">
                    {formatNok(quickStats.currentMonthRevenue)}
                  </p>
                </div>
                <div className="mt-8 space-y-3 border-t-2 border-success/20 pt-5">
                  <div className="flex justify-between text-sm md:text-base">
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
        </>
      ) : null}

      <BookingDetailSheet
        open={selectedBookingId != null && selectedRow != null}
        onOpenChange={(open) => {
          if (!open) setSelectedBookingId(null);
        }}
        row={selectedRow}
        updatingId={updatingId}
        onSetStatus={setBookingStatus}
      />

      <Link
        href="/app/bookings/new"
        className="fixed bottom-8 right-8 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform active:scale-95 md:hidden"
        aria-label="Ny booking"
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
