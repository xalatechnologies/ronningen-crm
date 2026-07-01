"use client";

import { useTranslation } from "@/i18n/client";
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
  const { t } = useTranslation();
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
        <span className="sr-only">{t("admin.overview_go_to", { label })}</span>
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
  const { t } = useTranslation();
  const metrics = data.metrics;
  const monthOverMonth = formatMonthOverMonth(
    data.revenueThisMonthNok,
    data.revenueLastMonthNok,
  );

  const mrrCaption =
    metrics.mrrNok === 0 && metrics.trialingSubscriptions > 0
      ? t("admin.overview_revenue_trialing_potential", {
          count: metrics.trialingSubscriptions,
          amount: formatNok(metrics.potentialMrrNok),
        })
      : t("admin.overview_active_subscriptions", {
          count: metrics.activeSubscriptions,
        });

  const momCaption =
    data.revenueLastMonthNok > 0
      ? `${formatNok(data.revenueThisMonthNok)} vs ${formatNok(data.revenueLastMonthNok)}`
      : t("admin.ingen_sammenligning_forrige_maned");

  return (
    <div className="admin-page-workspace admin-revenue-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title={t("admin.inntekt")}
            description={t("admin.finansiell_oversikt_pa_tvers_av_alle_leietakere")}
          />
        </div>

        <section className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8">
          <SectionIntro
            title={t("admin.saas_abonnement")}
            description={t("admin.plattformabonnement_og_estimert_mrr_basert_pa_aktive_leietak")}
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <RevenueKpiTile
              label={t("admin.mrr_estimat")}
              value={formatNok(metrics.mrrNok)}
              caption={mrrCaption}
              icon={TrendingUp}
              href={adminSubscriptionsHref("active")}
            />
            <RevenueKpiTile
              label={t("admin.arr_estimat")}
              value={formatNok(metrics.arrNok)}
              caption={t("admin.mrr_12")}
              icon={CalendarDays}
            />
            <RevenueKpiTile
              label={t("admin.churn_30_d")}
              value={`${metrics.churnRate30d}%`}
              caption={t("admin.avsluttede_abonnement_siste_30_dager")}
              icon={TrendingDown}
              iconContainerClassName="rounded-md bg-rn-danger-soft p-2"
              iconClassName="size-6 text-rn-danger-ink"
              valueClassName={
                metrics.churnRate30d > 0 ? "text-destructive" : "text-success"
              }
              href={adminSubscriptionsHref("canceled")}
            />
            <RevenueKpiTile
              label={t("admin.prove_betalt_30_d")}
              value={`${metrics.trialConversionRate30d}%`}
              caption={t("admin.konverterte_proveperioder")}
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
              title={t("admin.mrr_trend_12_mnd")}
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
            title={t("admin.booking_inntekt_leietaker")}
            description={t("admin.omsetning_registrert_i_bookinger_pa_tvers_av_leietakere_ikke")}
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <RevenueKpiTile
              label={t("admin.inntekt_denne_maneden")}
              value={formatNok(data.revenueThisMonthNok)}
              caption={t("admin.basert_pa_arrangementsdato")}
              icon={Wallet}
            />
            <RevenueKpiTile
              label={t("admin.inntekt_forrige_maned")}
              value={formatNok(data.revenueLastMonthNok)}
              caption={t("admin.fullfort_forrige_kalendermaned")}
              icon={CreditCard}
            />
            <RevenueKpiTile
              label={t("admin.utestaende_bookinger")}
              value={formatNok(data.outstandingNok)}
              caption={t("admin.gjenstaende_belop_i_aktive_bookinger")}
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
              label={t("admin.maned_over_maned")}
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
            title={t("admin.booking_inntekt_per_maned_12_mnd")}
            points={data.bookingRevenueTrend}
            valueFormat="nok"
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AdminQueuePanel
          title={t("admin.forfalt_betaling")}
          items={data.failedPaymentQueue}
          emptyLabel={t("admin.ingen_organisasjoner_med_forfalt_status")}
          viewAllHref={adminSubscriptionsHref("past_due")}
        />
        <AdminQueuePanel
          title={t("admin.proveperiode_utloper_snart")}
          items={data.trialExpiringQueue}
          emptyLabel={t("admin.ingen_proveperioder_utloper_innen_14_dager")}
          viewAllHref={adminSubscriptionsHref("trialing")}
        />
      </div>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8 md:py-5">
          <h2 className="app-section-title">{t("adminLabels.sections.activeSubscriptionsMrr")}</h2>
          <AdminLinkButton href={adminSubscriptionsHref("active")}>
            {t("adminLabels.actions.activeAll")}
          </AdminLinkButton>
        </div>

        <div className="app-table -mx-px max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[45rem] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={tableHeadClass}>{t("adminLabels.fields.organization")}</th>
                <th className={tableHeadClass}>{t("admin.plan")}</th>
                <th className={tableHeadClass}>{t("admin.status")}</th>
                <th className={cn(tableHeadClass, "text-right")}>MRR</th>
                <th className={cn(tableHeadClass, "text-right")}>{t("admin.medlemmer")}</th>
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
                        {t("adminLabels.empty.noActiveMrr")}
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
                          {t("admin.mrr_vises_nar_aktive_betalt")}
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
          {t("admin.saas_mrr_footnote")}
        </p>
      </div>
    </div>
  );
}
