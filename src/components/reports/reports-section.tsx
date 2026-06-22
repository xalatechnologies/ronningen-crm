import { AppPageHeader } from "@/components/layout/app-page-header";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  ShieldOff,
  TrendingDown,
  TrendingUp,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { ReportsYearMonthCalendar } from "./reports-year-month-calendar";
import type { EventTypeBreakdown, FestTypeBreakdown, ReportsSectionProps } from "./types";

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

const SECTION_NAV = [
  { id: "omsetning", label: "Omsetning" },
  { id: "reservasjoner", label: "Reservasjoner" },
  { id: "foresporsler", label: "Forespørsler" },
  { id: "overnatting", label: "Overnatting" },
  { id: "finans", label: "Finans" },
  { id: "fakturaer", label: "Fakturaer" },
  { id: "partnere", label: "Partnere" },
  { id: "priser", label: "Priser" },
  { id: "drift", label: "Drift" },
] as const;

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

function ReportsModuleSection({
  id,
  title,
  description,
  href,
  hrefLabel,
  isEmpty,
  emptyHint,
  children,
}: {
  id: string;
  title: string;
  description: string;
  href: string;
  hrefLabel: string;
  isEmpty?: boolean;
  emptyHint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 md:py-6"
      aria-label={title}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="app-section-title">{title}</h2>
          <p className="text-app-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-app-sm font-semibold text-success underline-offset-2 hover:underline"
        >
          {hrefLabel}
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
      {isEmpty && emptyHint ? (
        <div className="mt-4 rounded-md border border-rn-border-strong/60 bg-muted/20 px-4 py-3 text-app-sm text-muted-foreground">
          {emptyHint}
        </div>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
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

  const maxMonthlyAmount =
    monthlyRevenue.length > 0
      ? Math.max(0, ...monthlyRevenue.map((m) => m.amount))
      : 0;

  const { revenue, bookings, inquiries, accommodation, finance, invoices, partners, pricing } =
    kpis;

  const kpiGrid = "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4";

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
                    <div className="h-12 min-h-12 w-[5rem] shrink-0 animate-pulse rounded-md bg-muted/60 md:h-14 md:min-h-14 md:w-[5.25rem]" />
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
            <nav
              className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-app-sm"
              aria-label="Hopp til rapportseksjon"
            >
              {SECTION_NAV.map((item, i) => (
                <span key={item.id} className="inline-flex items-center gap-3">
                  {i > 0 ? (
                    <span className="text-muted-foreground/50" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <a
                    href={`#${item.id}`}
                    className="font-medium text-success underline-offset-2 hover:underline"
                  >
                    {item.label}
                  </a>
                </span>
              ))}
            </nav>
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
                Tall oppdateres automatisk når du registrerer{" "}
                <Link
                  href="/app/bookings/new"
                  className="font-semibold text-success underline-offset-2 hover:underline"
                >
                  reservasjoner
                </Link>
                ,{" "}
                <Link
                  href="/app/inquiries/new"
                  className="font-semibold text-success underline-offset-2 hover:underline"
                >
                  forespørsler
                </Link>
                ,{" "}
                <Link
                  href="/app/overnatting/new"
                  className="font-semibold text-success underline-offset-2 hover:underline"
                >
                  overnatting
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

        <ReportsModuleSection
          id="omsetning"
          title="Omsetning"
          description="Fakturert beløp fra reservasjoner og overnatting i valgt periode. Innbetalt og ubetalt gjelder kun reservasjoner."
          href="/app/bookings"
          hrefLabel="Reservasjoner"
          isEmpty={revenue.fakturertNok === 0}
          emptyHint={
            <>
              Ingen fakturert omsetning i {reportsPeriodLabel}.{" "}
              <Link
                href="/app/bookings/new"
                className="font-semibold text-success underline-offset-2 hover:underline"
              >
                Opprett reservasjon
              </Link>
            </>
          }
        >
          <div className={kpiGrid}>
            <ReportsKpiTile
              label="Fakturert totalt"
              value={formatNok(revenue.fakturertNok)}
              valueClassName="text-success"
            >
              <TrendBadge pct={revenue.revenueTrendPct} focusMonth={focusMonth} />
            </ReportsKpiTile>
            <ReportsKpiTile
              label="Reservasjoner fakturert"
              value={formatNok(revenue.bookingFakturertNok)}
            />
            <ReportsKpiTile
              label="Overnatting fakturert"
              value={formatNok(revenue.accommodationFakturertNok)}
            />
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
                  {(revenue.unpaidShareOfBooked * 100)
                    .toFixed(1)
                    .replace(".", ",")}{" "}
                  % av fakturert
                </p>
              ) : null}
            </ReportsKpiTile>
          </div>
        </ReportsModuleSection>

        <ReportsModuleSection
          id="reservasjoner"
          title="Reservasjoner"
          description="Aktive bookinger med arrangement i valgt periode."
          href="/app/bookings"
          hrefLabel="Alle reservasjoner"
          isEmpty={bookings.bookingCount === 0}
          emptyHint={
            <>
              Ingen bookinger i perioden.{" "}
              <Link
                href="/app/bookings/new"
                className="font-semibold text-success underline-offset-2 hover:underline"
              >
                Ny reservasjon
              </Link>
            </>
          }
        >
          <div className={cn(kpiGrid, "max-w-2xl")}>
            <ReportsKpiTile
              label="Bookinger"
              value={bookings.bookingCount}
              valueClassName="text-success"
            />
            <ReportsKpiTile
              label="Status"
              value={
                <span className="reports-kpi-caption-strong text-app-base font-semibold normal-case">
                  <span className="text-emerald-600">
                    {bookings.confirmedBookingCount} bekreftet
                  </span>
                  {" · "}
                  <span className="text-amber-700 dark:text-amber-400">
                    {bookings.pendingBookingCount} venter
                  </span>
                </span>
              }
            />
          </div>
        </ReportsModuleSection>

        <ReportsModuleSection
          id="foresporsler"
          title="Forespørsler"
          description="Åpne forespørsler i perioden, estimert verdi og konvertering."
          href="/app/inquiries"
          hrefLabel="Alle forespørsler"
          isEmpty={
            inquiries.openCount === 0 &&
            inquiries.convertedCount === 0 &&
            inquiries.lostCount === 0
          }
          emptyHint={
            <>
              Ingen forespørsler i perioden.{" "}
              <Link
                href="/app/inquiries/new"
                className="font-semibold text-success underline-offset-2 hover:underline"
              >
                Ny forespørsel
              </Link>
            </>
          }
        >
          <div className={kpiGrid}>
            <ReportsKpiTile label="Åpne" value={inquiries.openCount} />
            <ReportsKpiTile
              label="Estimert verdi"
              value={formatNok(inquiries.estimatedNok)}
            />
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
            <ReportsKpiTile
              label="Konverteringsrate"
              value={
                inquiries.conversionRatePct != null
                  ? `${inquiries.conversionRatePct.toFixed(0)} %`
                  : "—"
              }
            />
          </div>
        </ReportsModuleSection>

        <ReportsModuleSection
          id="overnatting"
          title="Overnatting"
          description="Overnattingsreservasjoner som overlapper valgt periode."
          href="/app/overnatting"
          hrefLabel="Alle overnattinger"
          isEmpty={accommodation.reservationCount === 0}
          emptyHint={
            <>
              Ingen overnatting i perioden.{" "}
              <Link
                href="/app/overnatting/new"
                className="font-semibold text-success underline-offset-2 hover:underline"
              >
                Ny overnatting
              </Link>
            </>
          }
        >
          <div className={cn(kpiGrid, "max-w-2xl")}>
            <ReportsKpiTile
              label="Reservasjoner"
              value={accommodation.reservationCount}
            />
            <ReportsKpiTile
              label="Fakturert"
              value={formatNok(accommodation.fakturertNok)}
            />
          </div>
        </ReportsModuleSection>

        <ReportsModuleSection
          id="finans"
          title="Finans"
          description="Registrerte transaksjoner i perioden — ikke samme tall som fakturert fra bookinger."
          href="/app/finance"
          hrefLabel="Finans"
          isEmpty={
            finance.incomeNok === 0 &&
            finance.expenseNok === 0
          }
          emptyHint={
            <>
              Ingen transaksjoner i perioden.{" "}
              <Link
                href="/app/finance"
                className="font-semibold text-success underline-offset-2 hover:underline"
              >
                Registrer inntekt eller utgift
              </Link>
            </>
          }
        >
          <div className={kpiGrid}>
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
            <ReportsKpiTile
              label="Resultat"
              value={formatNok(finance.netNok)}
              valueClassName={
                finance.netNok >= 0 ? "text-success" : "text-destructive"
              }
            />
          </div>
        </ReportsModuleSection>

        <ReportsModuleSection
          id="fakturaer"
          title="Fakturaer og betaling"
          description="Utestående beløp og forfalte ubetalte reservasjoner — gjelder alle aktive reservasjoner per i dag."
          href="/app/invoices"
          hrefLabel="Fakturaer"
          isEmpty={
            invoices.outstandingNok === 0 && invoices.overdueUnpaidCount === 0
          }
          emptyHint="Ingen utestående fakturaer akkurat nå."
        >
          <div className={cn(kpiGrid, "max-w-2xl")}>
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
        </ReportsModuleSection>

        <ReportsModuleSection
          id="partnere"
          title="Partnere og lokaler"
          description="Kunder, partnere og registrerte lokaler — nye kunder telles i valgt periode."
          href="/app/customers"
          hrefLabel="Partnere"
          isEmpty={
            partners.customerCount === 0 &&
            partners.partnerCount === 0 &&
            partners.propertyCount === 0
          }
          emptyHint={
            <>
              Ingen kunder eller partnere ennå.{" "}
              <Link
                href="/app/customers"
                className="font-semibold text-success underline-offset-2 hover:underline"
              >
                Legg til kunde
              </Link>
            </>
          }
        >
          <div className={kpiGrid}>
            <ReportsKpiTile label="Kunder totalt" value={partners.customerCount} />
            <ReportsKpiTile
              label="Nye kunder i perioden"
              value={partners.newCustomersInPeriod}
              valueClassName="text-success"
            />
            <ReportsKpiTile label="Partnere" value={partners.partnerCount} />
            <ReportsKpiTile label="Lokaler" value={partners.propertyCount} />
          </div>
        </ReportsModuleSection>

        <ReportsModuleSection
          id="priser"
          title="Priser"
          description="Antall pakker og tjenester i priskatalogen — ikke fakturert omsetning."
          href="/app/pricing"
          hrefLabel="Priser"
          isEmpty={pricing.packageCount === 0 && pricing.serviceCount === 0}
          emptyHint={
            <>
              Ingen pakker eller tjenester ennå.{" "}
              <Link
                href="/app/pricing"
                className="font-semibold text-success underline-offset-2 hover:underline"
              >
                Sett opp priser
              </Link>
            </>
          }
        >
          <div className={cn(kpiGrid, "max-w-2xl")}>
            <ReportsKpiTile label="Pakker" value={pricing.packageCount} />
            <ReportsKpiTile label="Tjenester" value={pricing.serviceCount} />
          </div>
        </ReportsModuleSection>

        <ReportsModuleSection
          id="drift"
          title="Drift og eiendom"
          description="Inventar etter tilstand og forsikring — samme logikk som Inventar-siden."
          href="/app/assets"
          hrefLabel="Inventar"
          isEmpty={
            facility.assetOperationalCount === 0 &&
            facility.assetMaintenanceCount === 0 &&
            facility.assetReplaceCount === 0
          }
          emptyHint={
            <>
              Ingen inventarlinjer registrert.{" "}
              <Link
                href="/app/assets"
                className="font-semibold text-success underline-offset-2 hover:underline"
              >
                Legg til inventar
              </Link>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
            <ReportsKpiTile
              label="I drift"
              value={facility.assetOperationalCount}
              valueClassName="text-emerald-700 dark:text-emerald-400"
            >
              <p className="reports-kpi-caption mt-2">God / normal tilstand</p>
            </ReportsKpiTile>
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
            >
              <p className="reports-kpi-caption mt-2">Krever oppfølging</p>
            </ReportsKpiTile>
            <ReportsKpiTile
              label={
                <span className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" aria-hidden />
                  Skal byttes
                </span>
              }
              value={facility.assetReplaceCount}
              valueClassName="text-destructive"
            >
              <p className="reports-kpi-caption mt-2">
                Utbedring eller erstatning
              </p>
            </ReportsKpiTile>
            <ReportsKpiTile
              label={
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-success" aria-hidden />
                  Forsikret verdi
                </span>
              }
              value={formatNok(facility.assetInsuredValueNok)}
            >
              <p className="reports-kpi-caption mt-2">
                {facility.assetInsuredLineCount}{" "}
                {facility.assetInsuredLineCount === 1 ? "linje" : "linjer"} som
                forsikret
              </p>
            </ReportsKpiTile>
            <ReportsKpiTile
              label={
                <span className="flex items-center gap-2">
                  <ShieldOff
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  Uforsikret verdi
                </span>
              }
              value={formatNok(facility.assetUninsuredValueNok)}
            >
              <p className="reports-kpi-caption mt-2">
                {facility.assetUninsuredLineCount}{" "}
                {facility.assetUninsuredLineCount === 1
                  ? "øvrig linje"
                  : "øvrige linjer"}
              </p>
            </ReportsKpiTile>
          </div>
        </ReportsModuleSection>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className={paddedCard("lg:col-span-2")}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="app-section-title">Omsetning per måned</h2>
            <span className="reports-chart-period-badge max-w-[14rem] rounded-full bg-secondary px-3 py-1 text-center tracking-wide text-secondary-foreground sm:max-w-none">
              {focusMonth != null
                ? reportsPeriodLabel
                : `${reportYear} · kalenderår`}
            </span>
          </div>
          <div className="flex h-48 items-end justify-between gap-1.5 px-1 sm:gap-2">
            {monthlyRevenue.map((m) => {
              const barPct =
                maxMonthlyAmount > 0 && m.amount > 0
                  ? Math.max(8, (m.amount / maxMonthlyAmount) * 100)
                  : 0;
              const hasValue = m.amount > 0;
              return (
                <div
                  key={m.monthIndex}
                  className={cn(
                    "group relative flex h-full min-w-0 flex-1 flex-col items-stretch justify-end transition-opacity",
                    focusMonth != null &&
                      m.monthIndex !== focusMonth &&
                      "opacity-35",
                    focusMonth != null &&
                      m.monthIndex === focusMonth &&
                      "opacity-100",
                  )}
                >
                  <span
                    className={cn(
                      "reports-chart-tooltip pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded border border-rn-accent-border bg-success px-2 py-0.5 whitespace-nowrap text-primary-foreground shadow-md group-hover:block",
                      focusMonth === m.monthIndex && "block",
                    )}
                  >
                    {formatNok(m.amount)}
                  </span>
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-colors",
                      hasValue
                        ? "min-h-[4px] bg-emerald-500/90 group-hover:bg-emerald-600"
                        : "h-1 shrink-0 rounded-sm bg-muted/50",
                      focusMonth === m.monthIndex &&
                        hasValue &&
                        "ring-2 ring-success ring-offset-2 ring-offset-background",
                    )}
                    style={
                      hasValue && barPct > 0
                        ? { height: `${barPct}%` }
                        : undefined
                    }
                    title={`${m.label}: ${formatNok(m.amount)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="reports-chart-axis mt-4 flex justify-between tracking-wide">
            {monthlyRevenue.map((m) => (
              <span
                key={m.monthIndex}
                className={cn(
                  focusMonth != null &&
                    m.monthIndex !== focusMonth &&
                    "opacity-35",
                )}
              >
                {m.label}
              </span>
            ))}
          </div>
        </section>

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
