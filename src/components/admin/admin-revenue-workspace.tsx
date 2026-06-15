"use client";

import { AdminKpiTile } from "@/components/admin/admin-kpi-tile";
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

const tableHeadClass =
  "px-6 py-4 text-left text-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 align-middle md:px-8 md:py-6";

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
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
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
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <AdminKpiTile
              variant="revenue"
              label="MRR (estimat)"
              value={formatNok(metrics.mrrNok)}
              caption={mrrCaption}
              icon={TrendingUp}
              href={adminSubscriptionsHref("active")}
            />
            <AdminKpiTile
              variant="revenue"
              label="ARR (estimat)"
              value={formatNok(metrics.arrNok)}
              caption="MRR × 12"
              icon={CalendarDays}
            />
            <AdminKpiTile
              variant="revenue"
              label="Churn (30 d.)"
              value={`${metrics.churnRate30d}%`}
              caption="Avsluttede abonnement siste 30 dager"
              icon={TrendingDown}
              iconClassName="bg-rn-danger-soft"
              valueClassName={
                metrics.churnRate30d > 0 ? "text-destructive" : "text-success"
              }
              href={adminSubscriptionsHref("canceled")}
            />
            <AdminKpiTile
              variant="revenue"
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

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <section className="px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8">
          <SectionIntro
            title="Booking-inntekt (leietaker)"
            description="Omsetning registrert i bookinger på tvers av leietakere — ikke plattformfakturering."
          />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <AdminKpiTile
              variant="revenue"
              label="Inntekt denne måneden"
              value={formatNok(data.revenueThisMonthNok)}
              caption="Basert på arrangementsdato"
              icon={Wallet}
            />
            <AdminKpiTile
              variant="revenue"
              label="Inntekt forrige måned"
              value={formatNok(data.revenueLastMonthNok)}
              caption="Fullført forrige kalendermåned"
              icon={CreditCard}
            />
            <AdminKpiTile
              variant="revenue"
              label="Utestående (bookinger)"
              value={formatNok(data.outstandingNok)}
              caption="Gjenstående beløp i aktive bookinger"
              icon={TrendingDown}
              iconClassName="bg-amber-500/10"
              valueClassName={
                data.outstandingNok > 0
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-success"
              }
            />
            <AdminKpiTile
              variant="revenue"
              label="Måned-over-måned"
              value={monthOverMonth}
              caption={momCaption}
              icon={ArrowUpRight}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 md:px-6 lg:px-8 lg:py-6">
          <AdminTrendChart
            embedded
            title="Booking-inntekt per måned (12 mnd.)"
            points={data.bookingRevenueTrend}
            valueFormat="nok"
          />
        </section>
      </div>

      <div className="grid gap-app-gap lg:grid-cols-2">
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

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <h2 className="app-section-title">Aktive abonnement (MRR)</h2>
          <AdminLinkButton href={adminSubscriptionsHref("active")}>
            Alle aktive
          </AdminLinkButton>
        </div>

        <div className="app-table overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-app-base">
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
