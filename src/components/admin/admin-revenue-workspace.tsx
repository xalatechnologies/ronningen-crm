"use client";

import { AdminLinkButton } from "@/components/admin/admin-action-button";
import {
  AdminPlanBadge,
  AdminStatusBadge,
} from "@/components/admin/admin-badges";
import { AdminPlanDistributionPanel } from "@/components/admin/admin-plan-distribution-panel";
import { AdminQueuePanel } from "@/components/admin/admin-queue-panel";
import { AdminSubscriptionStatusPanel } from "@/components/admin/admin-subscription-status-panel";
import { AdminTableDetailLink } from "@/components/admin/admin-table-detail-link";
import { AdminTrendChart } from "@/components/admin/admin-trend-chart";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { adminRoutes } from "@/config/admin-routes";
import { adminSubscriptionsHref } from "@/lib/admin/dashboard-links";
import {
  formatMonthOverMonth,
  type AdminRevenueOverview,
} from "@/lib/admin/queries/revenue";
import { formatNok } from "@/lib/admin/revenue-metrics";
import { SAAS_MONTHLY_PRICE_NOK } from "@/lib/billing/constants";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const kpiTileClass =
  "flex min-h-[length:var(--app-tap-target-min)] flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 shadow-sm sm:p-6";

const tableHeadClass =
  "px-4 py-3 text-left text-app-sm font-semibold tracking-wider text-rn-text-column uppercase sm:px-6 sm:py-4 sm:text-app-base md:px-8 md:py-5";
const tableCellClass =
  "px-4 py-4 align-middle sm:px-6 sm:py-5 md:px-8 md:py-6";

function RevenueKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  href,
  iconContainerClassName = "rounded-md bg-accent p-2 dark:bg-white/10",
  iconClassName = "size-6 text-primary dark:text-white",
  valueClassName = "text-success",
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  href?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
}) {
  const content = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="dashboard-kpi-label min-w-0 break-words">{label}</span>
        <div className={cn(iconContainerClassName, "shrink-0")}>
          <Icon className={iconClassName} aria-hidden />
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn("dashboard-kpi-value break-words", valueClassName)}>{value}</p>
        <p className="dashboard-kpi-caption mt-2 text-muted-foreground sm:mt-3">
          {caption}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          kpiTileClass,
          "group transition-colors hover:border-success/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30",
        )}
      >
        {content}
        <span className="sr-only">Gå til {label}</span>
      </Link>
    );
  }

  return <div className={kpiTileClass}>{content}</div>;
}

function SectionIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="app-section-title">{title}</h2>
      <p className="mt-1 app-text-secondary">{description}</p>
    </div>
  );
}

export function AdminRevenueWorkspace({
  data,
}: {
  data: AdminRevenueOverview;
}) {
  const metrics = data.metrics;
  const monthOverMonth = formatMonthOverMonth(
    data.revenueThisMonthNok,
    data.revenueLastMonthNok,
  );

  const mrrCaption =
    metrics.mrrNok === 0 && metrics.trialingSubscriptions > 0
      ? `${metrics.trialingSubscriptions} i prøve · pot. ${formatNok(metrics.potentialMrrNok)}`
      : `${metrics.activeSubscriptions} aktive abonnement`;

  const momCaption =
    data.revenueLastMonthNok > 0
      ? `${formatNok(data.revenueThisMonthNok)} vs ${formatNok(data.revenueLastMonthNok)}`
      : "Ingen sammenligning forrige måned";

  return (
    <div className="admin-page-workspace admin-revenue-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title="Inntekt"
            description="Finansiell oversikt på tvers av alle leietakere."
          />
        </div>

        <section className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8">
          <SectionIntro
            title="SaaS-abonnement"
            description="Plattformabonnement og estimert MRR basert på aktive leietakere."
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <RevenueKpiTile
              label="MRR (estimat)"
              value={formatNok(metrics.mrrNok)}
              caption={mrrCaption}
              icon={TrendingUp}
              href={adminSubscriptionsHref("active")}
            />
            <RevenueKpiTile
              label="ARR (estimat)"
              value={formatNok(metrics.arrNok)}
              caption="MRR × 12"
              icon={CalendarDays}
            />
            <RevenueKpiTile
              label="Churn (30 d.)"
              value={`${metrics.churnRate30d}%`}
              caption="Avsluttede abonnement siste 30 dager"
              icon={TrendingDown}
              iconContainerClassName="rounded-md bg-rn-danger-soft p-2"
              iconClassName="size-6 text-rn-danger-ink"
              valueClassName={
                metrics.churnRate30d > 0 ? "text-destructive" : "text-success"
              }
              href={adminSubscriptionsHref("canceled")}
            />
            <RevenueKpiTile
              label="Prøve → betalt (30 d.)"
              value={`${metrics.trialConversionRate30d}%`}
              caption="Konverterte prøveperioder"
              icon={RefreshCw}
              href={adminSubscriptionsHref("trialing")}
            />
          </div>
        </section>

        <section className="grid border-t border-rn-border-strong/50 lg:grid-cols-2">
          <div className="border-rn-border-strong/50 px-4 py-5 sm:px-5 md:px-6 lg:border-r lg:px-8 lg:py-6">
            <AdminTrendChart
              className="admin-overview-trend-chart"
              embedded
              title="MRR-trend (12 mnd.)"
              points={data.revenueTrend}
              valueFormat="nok"
            />
          </div>
          <div className="px-4 py-5 sm:px-5 md:px-6 lg:px-8 lg:py-6">
            <AdminSubscriptionStatusPanel
              embedded
              statusCounts={data.statusCounts}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 md:px-6 lg:px-8 lg:py-6">
          <AdminPlanDistributionPanel embedded planCounts={data.planCounts} />
        </section>
      </div>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <section className="px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8">
          <SectionIntro
            title="Booking-inntekt (leietaker)"
            description="Omsetning registrert i bookinger på tvers av leietakere — ikke plattformfakturering."
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <RevenueKpiTile
              label="Inntekt denne måneden"
              value={formatNok(data.revenueThisMonthNok)}
              caption="Basert på arrangementsdato"
              icon={Wallet}
            />
            <RevenueKpiTile
              label="Inntekt forrige måned"
              value={formatNok(data.revenueLastMonthNok)}
              caption="Fullført forrige kalendermåned"
              icon={CreditCard}
            />
            <RevenueKpiTile
              label="Utestående (bookinger)"
              value={formatNok(data.outstandingNok)}
              caption="Gjenstående beløp i aktive bookinger"
              icon={TrendingDown}
              iconContainerClassName="rounded-md bg-amber-500/10 p-2"
              iconClassName="size-6 text-amber-800 dark:text-amber-300"
              valueClassName={
                data.outstandingNok > 0
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-success"
              }
            />
            <RevenueKpiTile
              label="Måned-over-måned"
              value={monthOverMonth}
              caption={momCaption}
              icon={ArrowUpRight}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 md:px-6 lg:px-8 lg:py-6">
          <AdminTrendChart
            className="admin-overview-trend-chart"
            embedded
            title="Booking-inntekt per måned (12 mnd.)"
            points={data.bookingRevenueTrend}
            valueFormat="nok"
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AdminQueuePanel
          title="Forfalt betaling"
          items={data.failedPaymentQueue}
          emptyLabel="Ingen organisasjoner med forfalt status."
          viewAllHref={adminSubscriptionsHref("past_due")}
        />
        <AdminQueuePanel
          title="Prøveperiode utløper snart"
          items={data.trialExpiringQueue}
          emptyLabel="Ingen prøveperioder utløper innen 14 dager."
          viewAllHref={adminSubscriptionsHref("trialing")}
        />
      </div>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8 md:py-5">
          <h2 className="app-section-title">Aktive abonnement (MRR)</h2>
          <AdminLinkButton href={adminSubscriptionsHref("active")}>
            Alle aktive
          </AdminLinkButton>
        </div>

        <div className="app-table -mx-px max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[45rem] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={tableHeadClass}>Organisasjon</th>
                <th className={tableHeadClass}>Plan</th>
                <th className={tableHeadClass}>Status</th>
                <th className={cn(tableHeadClass, "text-right")}>MRR</th>
                <th className={cn(tableHeadClass, "text-right")}>Medlemmer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {data.activePayers.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-rn-surface-row-hover"
                >
                  <td className="p-0 align-middle">
                    <AdminTableDetailLink
                      href={adminRoutes.organizationDetail(row.id)}
                      title={row.name}
                      subtitle={row.slug}
                    />
                  </td>
                  <td className={tableCellClass}>
                    <AdminPlanBadge plan={row.plan} />
                  </td>
                  <td className={tableCellClass}>
                    <AdminStatusBadge status={row.status} />
                  </td>
                  <td className={cn(tableCellClass, "text-right tabular-nums font-semibold text-success")}>
                    {formatNok(SAAS_MONTHLY_PRICE_NOK)}
                  </td>
                  <td className={cn(tableCellClass, "text-right tabular-nums")}>
                    {row.memberCount}
                  </td>
                </tr>
              ))}
              {data.activePayers.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="space-y-3 px-6 py-16 text-center sm:px-10 sm:py-20 md:px-8">
                      <p className="font-heading text-lg font-bold tracking-tight text-rn-text-heading">
                        Ingen aktive abonnement med MRR akkurat nå
                      </p>
                      {metrics.trialingSubscriptions > 0 ? (
                        <p className="app-text-secondary">
                          <Link
                            href={adminSubscriptionsHref("trialing")}
                            className="font-semibold text-success hover:underline"
                          >
                            {metrics.trialingSubscriptions} organisasjoner i
                            prøveperiode
                          </Link>
                        </p>
                      ) : (
                        <p className="mx-auto max-w-lg text-muted-foreground">
                          MRR vises når organisasjoner har aktive betalte
                          abonnement.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          SaaS-MRR baseres på aktive abonnement til listepris. Booking-inntekt er
          omsetning registrert av leietakere, ikke plattformfakturering.
        </p>
      </div>
    </div>
  );
}
