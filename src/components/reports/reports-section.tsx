"use client";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, type ReactNode } from "react";

import { ReportsMonthlyChart } from "./reports-monthly-chart";
import { ReportsYearMonthCalendar } from "./reports-year-month-calendar";
import type {
  EventTypeBreakdown,
  FestTypeBreakdown,
  ReportsFacilityStats,
  ReportsModuleKpis,
  ReportsSectionProps,
} from "./types";

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number | null, digits = 1) {
  if (n == null) return null;
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits).replace(".", ",")} %`;
}

const KPI_TILE_CLASS =
  "flex flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-6 shadow-sm";

const KPI_GRID =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4";

function ReportsKpiTile({
  label,
  value,
  valueClassName,
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className={KPI_TILE_CLASS}>
      <p className="reports-kpi-label mb-3">{label}</p>
      <p className={cn("reports-kpi-value", valueClassName)}>{value}</p>
      {children}
    </div>
  );
}

function TrendBadge({
  pct,
  focusMonth,
}: {
  pct: number | null;
  focusMonth: number | null;
}) {
  if (pct == null) return null;
  return (
    <div
      className={cn(
        "reports-kpi-trend mt-3 flex items-center gap-1",
        pct >= 0 ? "text-emerald-600" : "text-destructive",
      )}
    >
      {pct >= 0 ? (
        <TrendingUp className="size-4 shrink-0" aria-hidden />
      ) : (
        <TrendingDown className="size-4 shrink-0" aria-hidden />
      )}
      <span>
        {formatPct(pct)}{" "}
        {focusMonth != null ? "mot samme periode i fjor" : "vs. fjorår"}
      </span>
    </div>
  );
}

function ReportsSectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="app-section-title">{title}</h2>
      <p className="text-app-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function OkonomiSection({
  revenue,
  finance,
  focusMonth,
  reportsPeriodLabel,
}: {
  revenue: ReportsModuleKpis["revenue"];
  finance: ReportsModuleKpis["finance"];
  focusMonth: number | null;
  reportsPeriodLabel: string;
}) {
  const isEmpty =
    revenue.fakturertNok === 0 &&
    finance.incomeNok === 0 &&
    finance.expenseNok === 0;

  return (
    <section
      id="okonomi"
      className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 md:py-6"
      aria-label="Økonomi"
    >
      <ReportsSectionHeader
        title="Økonomi"
        description="Fakturert omsetning og betaling fra reservasjoner i valgt periode. Resultat er fra registrerte finanstransaksjoner."
      />
      {isEmpty ? (
        <div className="mt-4 rounded-md border border-rn-border-strong/60 bg-muted/20 px-4 py-3 text-app-sm text-muted-foreground">
          Ingen økonomidata i {reportsPeriodLabel}.{" "}
          <Link
            href="/app/bookings/new"
            className="font-semibold text-success underline-offset-2 hover:underline"
          >
            Opprett reservasjon
          </Link>
        </div>
      ) : null}
      <div className={cn(KPI_GRID, "mt-5")}>
        <ReportsKpiTile
          label="Fakturert"
          value={formatNok(revenue.fakturertNok)}
          valueClassName="text-success"
        >
          <p className="reports-kpi-caption mt-3 tabular-nums">
            Reservasjoner {formatNok(revenue.bookingFakturertNok)} · Overnatting{" "}
            {formatNok(revenue.accommodationFakturertNok)}
          </p>
          <TrendBadge pct={revenue.revenueTrendPct} focusMonth={focusMonth} />
        </ReportsKpiTile>
        <ReportsKpiTile
          label="Innbetalt"
          value={formatNok(revenue.totalPaid)}
          valueClassName="text-success"
        >
          <div className="mt-4 h-1.5 w-full rounded-full border border-rn-border-strong/30 bg-muted/40">
            <div
              className="h-full rounded-full bg-success"
              style={{
                width: `${Math.min(100, Math.round(revenue.paidShare * 100))}%`,
              }}
            />
          </div>
        </ReportsKpiTile>
        <ReportsKpiTile
          label="Ubetalt"
          value={formatNok(revenue.totalUnpaid)}
          valueClassName="text-destructive"
        >
          {revenue.fakturertNok > 0 ? (
            <p className="reports-kpi-caption mt-3 font-medium tabular-nums">
              {(revenue.unpaidShareOfBooked * 100).toFixed(1).replace(".", ",")} %
              av fakturert
            </p>
          ) : null}
          {revenue.totalUnpaid > 0 ? (
            <Link
              href="/app/invoices"
              className="reports-inline-link mt-2 inline-flex text-success underline-offset-2 hover:underline"
            >
              Fakturaer →
            </Link>
          ) : null}
        </ReportsKpiTile>
        <ReportsKpiTile
          label="Resultat"
          value={formatNok(finance.netNok)}
          valueClassName={
            finance.netNok >= 0 ? "text-success" : "text-destructive"
          }
        >
          <p className="reports-kpi-caption mt-3">
            Transaksjoner i perioden — ikke samme som fakturert
          </p>
        </ReportsKpiTile>
      </div>
    </section>
  );
}

function PipelineSection({
  bookings,
  inquiries,
}: {
  bookings: ReportsModuleKpis["bookings"];
  inquiries: ReportsModuleKpis["inquiries"];
}) {
  const isEmpty =
    bookings.bookingCount === 0 &&
    inquiries.openCount === 0 &&
    inquiries.conversionRatePct == null;

  return (
    <section
      id="pipeline"
      className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 md:py-6"
      aria-label="Pipeline"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <ReportsSectionHeader
          title="Pipeline"
          description="Bookinger og forespørsler i valgt periode."
        />
        <div className="flex shrink-0 flex-wrap gap-3 text-app-sm font-semibold">
          <Link
            href="/app/bookings"
            className="text-success underline-offset-2 hover:underline"
          >
            Reservasjoner
          </Link>
          <span className="text-muted-foreground/50" aria-hidden>
            ·
          </span>
          <Link
            href="/app/inquiries"
            className="text-success underline-offset-2 hover:underline"
          >
            Forespørsler
          </Link>
        </div>
      </div>
      {isEmpty ? (
        <div className="mt-4 rounded-md border border-rn-border-strong/60 bg-muted/20 px-4 py-3 text-app-sm text-muted-foreground">
          Ingen pipeline-aktivitet i perioden.
        </div>
      ) : null}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        <ReportsKpiTile
          label="Bookinger"
          value={bookings.bookingCount}
          valueClassName="text-success"
        >
          <p className="reports-kpi-caption-strong mt-3">
            <span className="text-emerald-600">
              {bookings.confirmedBookingCount} bekreftet
            </span>
            {" · "}
            <span className="text-amber-700 dark:text-amber-400">
              {bookings.pendingBookingCount} venter
            </span>
          </p>
        </ReportsKpiTile>
        <ReportsKpiTile label="Åpne forespørsler" value={inquiries.openCount}>
          <p className="reports-kpi-caption mt-3">
            Estimert{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatNok(inquiries.estimatedNok)}
            </span>
          </p>
        </ReportsKpiTile>
        <ReportsKpiTile
          label="Konvertering"
          value={
            inquiries.conversionRatePct != null
              ? `${inquiries.conversionRatePct.toFixed(0)} %`
              : "—"
          }
        />
      </div>
    </section>
  );
}

function InventarSection({ facility }: { facility: ReportsFacilityStats }) {
  const isEmpty = facility.assetRowCount === 0;

  return (
    <section
      id="inventar"
      className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 md:py-6"
      aria-label="Inventar"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <ReportsSectionHeader
          title="Inventar"
          description="Total verdi og tilstand i inventarregisteret per i dag."
        />
        <Link
          href="/app/assets"
          className="shrink-0 text-app-sm font-semibold text-success underline-offset-2 hover:underline"
        >
          Inventar →
        </Link>
      </div>
      {isEmpty ? (
        <div className="mt-4 rounded-md border border-rn-border-strong/60 bg-muted/20 px-4 py-3 text-app-sm text-muted-foreground">
          Ingen inventar registrert ennå.{" "}
          <Link
            href="/app/assets"
            className="font-semibold text-success underline-offset-2 hover:underline"
          >
            Legg til inventar
          </Link>
        </div>
      ) : (
        <div className={cn(KPI_GRID, "mt-5")}>
          <ReportsKpiTile
            label="Inventar total"
            value={formatNok(facility.assetTotalValueNok)}
            valueClassName="text-success"
          >
            <p className="reports-kpi-caption mt-3 tabular-nums">
              {facility.assetRowCount}{" "}
              {facility.assetRowCount === 1 ? "registrering" : "registreringer"}{" "}
              · {facility.assetTotalUnits}{" "}
              {facility.assetTotalUnits === 1 ? "enhet" : "enheter"}
            </p>
          </ReportsKpiTile>
          <ReportsKpiTile
            label="I drift"
            value={facility.assetOperationalCount}
          />
          <ReportsKpiTile
            label="Vedlikehold"
            value={facility.assetMaintenanceCount}
          />
          <ReportsKpiTile label="Bytte" value={facility.assetReplaceCount} />
        </div>
      )}
    </section>
  );
}

function ReportsDetailsCollapsible({
  kpis,
  facility,
  focusMonth,
}: {
  kpis: ReportsModuleKpis;
  facility: ReportsFacilityStats;
  focusMonth: number | null;
}) {
  const [open, setOpen] = useState(false);
  const { finance, invoices, inquiries, accommodation } = kpis;
  const showDriftAlert =
    facility.assetMaintenanceCount + facility.assetReplaceCount > 0;

  return (
    <section
      className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 md:py-6"
      aria-label="Detaljer"
    >
      <Button
        type="button"
        variant="ghost"
        className="flex h-auto w-full items-center justify-between gap-3 px-0 py-1 text-left hover:bg-transparent"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <span className="app-section-title block">Vis detaljer</span>
          <span className="mt-1 block text-app-sm font-normal text-muted-foreground">
            Finans, fakturaer, forespørsler, overnatting
            {showDriftAlert ? " og inventar-varsel" : ""}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Button>

      {open ? (
        <div className="mt-6 space-y-8">
          <div>
            <h3 className="mb-4 text-app-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Finans
            </h3>
            <div className={KPI_GRID}>
              <ReportsKpiTile
                label="Inntekt"
                value={formatNok(finance.incomeNok)}
                valueClassName="text-success"
              >
                <TrendBadge pct={finance.incomeTrendPct} focusMonth={focusMonth} />
              </ReportsKpiTile>
              <ReportsKpiTile
                label="Utgift"
                value={formatNok(finance.expenseNok)}
                valueClassName="text-destructive"
              >
                <TrendBadge pct={finance.expenseTrendPct} focusMonth={focusMonth} />
              </ReportsKpiTile>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-app-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Fakturaer
            </h3>
            <p className="mb-4 text-app-sm text-muted-foreground">
              Gjelder alle aktive reservasjoner per i dag.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <ReportsKpiTile
                label="Utestående totalt"
                value={formatNok(invoices.outstandingNok)}
                valueClassName="text-destructive"
              />
              <ReportsKpiTile
                label="Forfalt ubetalt"
                value={invoices.overdueUnpaidCount}
                valueClassName={
                  invoices.overdueUnpaidCount > 0
                    ? "text-destructive"
                    : "text-foreground"
                }
              >
                <p className="reports-kpi-caption mt-2">
                  {invoices.overdueUnpaidCount === 0
                    ? "Ingen forfalte bookinger"
                    : `${invoices.overdueUnpaidCount} booking${invoices.overdueUnpaidCount !== 1 ? "er" : ""} etter arrangementsdato`}
                </p>
              </ReportsKpiTile>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-app-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Forespørsler
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <ReportsKpiTile
                label="Konverterte"
                value={inquiries.convertedCount}
                valueClassName="text-success"
              />
              <ReportsKpiTile
                label="Tapte"
                value={inquiries.lostCount}
                valueClassName="text-destructive"
              />
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-app-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Overnatting
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <ReportsKpiTile
                label="Reservasjoner"
                value={accommodation.reservationCount}
              />
              <ReportsKpiTile
                label="Fakturert"
                value={formatNok(accommodation.fakturertNok)}
              />
            </div>
          </div>

          {showDriftAlert ? (
            <div>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-app-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Inventar-varsel
                </h3>
                <Link
                  href="/app/assets"
                  className="text-app-sm font-semibold text-success underline-offset-2 hover:underline"
                >
                  Gå til inventar →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                <ReportsKpiTile
                  label={
                    <span className="flex items-center gap-2">
                      <Wrench
                        className="size-4 text-amber-700 dark:text-amber-400"
                        aria-hidden
                      />
                      Vedlikehold
                    </span>
                  }
                  value={facility.assetMaintenanceCount}
                  valueClassName="text-amber-900 dark:text-amber-200"
                />
                <ReportsKpiTile
                  label={
                    <span className="flex items-center gap-2">
                      <AlertTriangle
                        className="size-4 text-destructive"
                        aria-hidden
                      />
                      Skal byttes
                    </span>
                  }
                  value={facility.assetReplaceCount}
                  valueClassName="text-destructive"
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ReportsModuleFooter() {
  return (
    <div className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6">
      <p className="text-app-sm text-muted-foreground">
        Se også:{" "}
        <Link
          href="/app/finance"
          className="font-medium text-success underline-offset-2 hover:underline"
        >
          Finans
        </Link>
        {" · "}
        <Link
          href="/app/customers?tab=partners"
          className="font-medium text-success underline-offset-2 hover:underline"
        >
          Partnere
        </Link>
        {" · "}
        <Link
          href="/app/assets"
          className="font-medium text-success underline-offset-2 hover:underline"
        >
          Inventar
        </Link>
        {" · "}
        <Link
          href="/app/pricing"
          className="font-medium text-success underline-offset-2 hover:underline"
        >
          Priser
        </Link>
      </p>
    </div>
  );
}

function eventPillClass(eventType: string) {
  const t = eventType.toLowerCase();
  if (t.includes("bryllup") || t.includes("wedding")) {
    return "bg-emerald-50 text-emerald-900";
  }
  if (t.includes("bedrift") || t.includes("corporate")) {
    return "bg-blue-50 text-blue-900";
  }
  if (t.includes("privat") || t.includes("private")) {
    return "bg-amber-50 text-amber-900";
  }
  return "bg-muted text-muted-foreground";
}

const BAR_BG = [
  "bg-emerald-100",
  "bg-emerald-500",
  "bg-emerald-400",
  "bg-emerald-300",
  "bg-success",
] as const;

function eventBarClass(i: number) {
  return BAR_BG[i % BAR_BG.length]!;
}

function FestTypeBreakdownRow({
  row,
  index,
}: {
  row: FestTypeBreakdown;
  index: number;
}) {
  return (
    <div className="relative pt-2">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span
          className={cn(
            "reports-breakdown-pill inline-flex w-fit rounded-full px-3 py-1.5 font-bold tracking-wide md:px-4 md:py-2",
            eventPillClass(row.festType),
          )}
        >
          {row.festType}
        </span>
        <span className="reports-breakdown-stats text-left sm:text-right">
          <span className="text-foreground">{row.count}</span>
          <span className="reports-breakdown-stats-meta text-muted-foreground">
            {" "}
            {row.count === 1 ? "booking" : "bookinger"} · {row.pct.toFixed(0)}%
          </span>
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted md:h-4">
        <div
          className={cn(
            "flex flex-col justify-center whitespace-nowrap text-center text-white shadow-none transition-[width]",
            eventBarClass(index),
          )}
          style={{
            width:
              row.count === 0
                ? "0%"
                : `${Math.min(100, Math.max(row.pct, 6))}%`,
          }}
        />
      </div>
    </div>
  );
}

function BreakdownRow({
  row,
  index,
}: {
  row: EventTypeBreakdown;
  index: number;
}) {
  return (
    <div className="relative pt-2">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span
          className={cn(
            "reports-breakdown-pill inline-flex w-fit rounded-full px-3 py-1.5 font-bold tracking-wide uppercase md:px-4 md:py-2",
            eventPillClass(row.eventType),
          )}
        >
          {row.eventType}
        </span>
        <span className="reports-breakdown-stats text-left sm:text-right">
          <span className="text-foreground">{row.count}</span>
          <span className="reports-breakdown-stats-meta text-muted-foreground">
            {" "}
            {row.count === 1 ? "booking" : "bookinger"} · {row.pct.toFixed(0)}%
          </span>
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted md:h-4">
        <div
          className={cn(
            "flex flex-col justify-center whitespace-nowrap text-center text-white shadow-none transition-[width]",
            eventBarClass(index),
          )}
          style={{
            width:
              row.count === 0
                ? "0%"
                : `${Math.min(100, Math.max(row.pct, 6))}%`,
          }}
        />
      </div>
    </div>
  );
}

export function ReportsSection({
  kpis,
  monthlyRevenue,
  eventBreakdown,
  festTypeBreakdown,
  facility,
  reportYear,
  calendarYearMax,
  focusMonth,
  reportsPeriodLabel,
  loadError,
  hasRegisteredActivity,
}: ReportsSectionProps) {
  const paddedCard = (extra?: string) => cn("p-6", RN_CARD_SHELL, extra);

  const { revenue, bookings, inquiries, finance } = kpis;

  return (
    <div className="reports-page-workspace mx-auto flex w-full flex-col gap-8 pb-8">
      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <div className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            title="Rapporter"
            actions={
              <Suspense
                fallback={
                  <div
                    className="flex w-full flex-row flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:shrink-0 md:gap-3"
                    aria-hidden
                  >
                    <div className="h-12 min-h-12 w-20 shrink-0 animate-pulse rounded-md bg-muted/60 md:h-14 md:min-h-14 md:w-21" />
                    <div className="h-12 min-h-12 w-40 shrink-0 animate-pulse rounded-md bg-muted/60 md:h-14 md:min-h-14 md:w-48" />
                  </div>
                }
              >
                <ReportsYearMonthCalendar
                  reportYear={reportYear}
                  calendarYearMax={calendarYearMax}
                />
              </Suspense>
            }
          />
          {!loadError && hasRegisteredActivity ? (
            <p className="mt-4 text-app-sm">
              <a
                href="#diagram"
                className="font-medium text-success underline-offset-2 hover:underline"
              >
                Hopp til diagram
              </a>
            </p>
          ) : null}
        </div>

        {loadError ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="alert"
          >
            <div className="reports-load-error rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
              Kunne ikke laste data: {loadError}
            </div>
          </div>
        ) : null}

        {!loadError && !hasRegisteredActivity ? (
          <div className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6">
            <div className="rounded-md border border-rn-border-strong/60 bg-muted/20 px-4 py-4 text-app-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Ingen registrert aktivitet ennå.
              </p>
              <p className="mt-2">
                Tall oppdateres når du registrerer{" "}
                <Link
                  href="/app/bookings/new"
                  className="font-semibold text-success underline-offset-2 hover:underline"
                >
                  reservasjoner
                </Link>{" "}
                eller{" "}
                <Link
                  href="/app/finance"
                  className="font-semibold text-success underline-offset-2 hover:underline"
                >
                  finans
                </Link>
                .
              </p>
            </div>
          </div>
        ) : null}

        {!loadError ? (
          <>
            <OkonomiSection
              revenue={revenue}
              finance={finance}
              focusMonth={focusMonth}
              reportsPeriodLabel={reportsPeriodLabel}
            />
            <PipelineSection bookings={bookings} inquiries={inquiries} />
            <InventarSection facility={facility} />
            <ReportsDetailsCollapsible
              kpis={kpis}
              facility={facility}
              focusMonth={focusMonth}
            />
            <ReportsModuleFooter />
          </>
        ) : null}
      </div>

      <div id="diagram" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportsMonthlyChart
          monthlyRevenue={monthlyRevenue}
          reportYear={reportYear}
          focusMonth={focusMonth}
          reportsPeriodLabel={reportsPeriodLabel}
        />

        <section className={paddedCard("p-7 md:p-8")}>
          <h2 className="app-section-title mb-8">Privat og bedrift</h2>
          {bookings.bookingCount === 0 ? (
            <p className="reports-empty-hint">
              {focusMonth != null
                ? "Ingen bookinger med arrangement i denne måneden."
                : "Ingen aktive bookinger å vise i perioden."}
            </p>
          ) : (
            <div className="flex flex-col gap-8 md:gap-10">
              {eventBreakdown.map((row, i) => (
                <BreakdownRow key={row.eventType} row={row} index={i} />
              ))}
              {festTypeBreakdown.length > 0 ? (
                <div className="border-t border-rn-border-strong/40 pt-8">
                  <h3 className="mb-6 text-app-base font-bold tracking-tight text-foreground">
                    Arrangementstyper
                  </h3>
                  <div className="flex flex-col gap-8">
                    {festTypeBreakdown.map((row, i) => (
                      <FestTypeBreakdownRow
                        key={row.festType}
                        row={row}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
