import {
  AdminPlanBadge,
  AdminStatusBadge,
} from "@/components/admin/admin-badges";
import { AdminLinkButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminQueuePanel } from "@/components/admin/admin-queue-panel";
import { AdminSubscriptionStatusPanel } from "@/components/admin/admin-subscription-status-panel";
import { AdminTrendChart } from "@/components/admin/admin-trend-chart";
import { AppPageHeader } from "@/components/layout/app-page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRoutes } from "@/config/admin-routes";
import { getDateFnsLocale } from "@/i18n/formatters";
import { getServerTranslation } from "@/i18n/server";
import { formatAuditActionLabel } from "@/lib/admin/audit-labels";
import {
  adminOrganizationsHref,
  adminSubscriptionsHref,
  adminUsersHref,
} from "@/lib/admin/dashboard-links";
import { fetchAdminOverviewStats } from "@/lib/admin/queries/overview";
import { formatNok } from "@/lib/admin/revenue-metrics";
import { RN_ADMIN_DETAIL_LINK, RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Building2,
  CalendarCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

const sectionPad =
  "px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 md:py-6";

const kpiTileClass =
  "admin-overview-kpi-tile flex min-h-[length:var(--app-tap-target-min)] flex-col justify-between rounded-md border border-rn-border-strong bg-muted/25 p-5 shadow-sm dark:bg-white/[0.06] sm:p-6";

const tableHeadClass =
  "admin-overview-table-head px-4 py-3.5 text-app-sm font-bold tracking-[0.07em] text-foreground uppercase sm:px-6 sm:py-4 sm:text-app-base md:px-8 md:py-5";
const tableCellClass =
  "px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6";

function OverviewSectionIntro({
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

function OverviewKpiTile({
  label,
  value,
  hint,
  href,
  goToLabel,
  icon: Icon,
  iconContainerClassName = "rounded-md bg-accent p-2 dark:bg-white/10",
  iconClassName = "size-6 text-primary dark:text-white",
  valueClassName = "text-success",
}: {
  label: string;
  value: string | number;
  hint?: ReactNode;
  href: string;
  icon: LucideIcon;
  iconContainerClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
  goToLabel: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        kpiTileClass,
        "group transition-colors hover:border-success/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="dashboard-kpi-label min-w-0 break-words">{label}</span>
        <div className={cn(iconContainerClassName, "shrink-0")}>
          <Icon className={iconClassName} aria-hidden />
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn("dashboard-kpi-value break-words", valueClassName)}>
          {value}
        </p>
        {hint ? (
          <p className="dashboard-kpi-caption mt-2 text-muted-foreground sm:mt-3">
            {hint}
          </p>
        ) : null}
      </div>
      <span className="sr-only">{goToLabel}</span>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const { t, locale } = await getServerTranslation();
  const stats = await fetchAdminOverviewStats();
  const goTo = (label: string) => t("admin.overview_go_to", { label });
  const { revenue } = stats;
  const chartYear = new Date().getFullYear();
  const trialingCount = revenue.trialingSubscriptions;
  const activeCount = revenue.activeSubscriptions;
  const estimatedMrrNok = stats.estimatedMrrNok;
  const currentMonthMrr =
    stats.revenueTrend[new Date().getMonth()]?.value ?? estimatedMrrNok;

  const mrrHint =
    revenue.mrrNok > 0 ? (
      <span>
        {t("admin.overview_mrr_realized", { amount: formatNok(revenue.mrrNok) })}
        {trialingCount > 0
          ? t("admin.overview_trialing_suffix", { count: trialingCount })
          : ""}
      </span>
    ) : trialingCount > 0 ? (
      <span>
        {t("admin.overview_trialing_active_payers", {
          trialing: trialingCount,
          active: activeCount,
        })}
      </span>
    ) : (
      t("admin.ingen_aktive_eller_provende_abonnement")
    );

  const orgHint =
    trialingCount > 0
      ? t("admin.overview_trialing_active", {
          trialing: trialingCount,
          active: activeCount,
        })
      : t("admin.overview_active_subscriptions", { count: activeCount });

  return (
    <div className="admin-page-workspace admin-overview-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <div
        className={cn(
          "dashboard-oversikt-card min-w-0 overflow-hidden",
          RN_CARD_SHELL,
        )}
      >
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title={t("admin.plattformoversikt")}
            description={t("admin.saas_kpier_trender_og_koer_pa_tvers_av_alle_organisasjoner")}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <AdminLinkButton href={adminRoutes.revenue}>{t("admin.inntekt")}</AdminLinkButton>
                <AdminLinkButton href={adminSubscriptionsHref()}>{t("admin.abonnement")}</AdminLinkButton>
                <AdminLinkButton href={adminOrganizationsHref()}>{t("admin.organisasjoner")}</AdminLinkButton>
              </div>
            }
          />
        </div>

        <section
          className={cn("border-t border-rn-border-strong/50", sectionPad)}
          aria-label={t("admin.abonnement_og_inntekt")}
        >
          <OverviewSectionIntro
            title={t("admin.abonnement_og_inntekt")}
            description={t("admin.mrr_churn_og_konvertering_fra_prove_til_betalt")}
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <OverviewKpiTile
              label={t("admin.organisasjoner")}
              value={stats.organizationCount}
              href={adminOrganizationsHref()}
              hint={orgHint}
              goToLabel={goTo(t("admin.organisasjoner"))}
              icon={Building2}
            />
            <OverviewKpiTile
              label={t("admin.mrr_est")}
              value={formatNok(estimatedMrrNok)}
              href={adminRoutes.revenue}
              hint={mrrHint}
              goToLabel={goTo(t("admin.mrr_est"))}
              icon={TrendingUp}
              valueClassName={
                estimatedMrrNok > 0 ? "text-success" : "text-foreground"
              }
            />
            <OverviewKpiTile
              label={t("admin.churn_30_d")}
              value={`${revenue.churnRate30d}%`}
              href={adminSubscriptionsHref("canceled")}
              goToLabel={goTo(t("admin.churn_30_d"))}
              icon={TrendingDown}
              iconContainerClassName="rounded-md bg-rn-danger-soft p-2"
              iconClassName="size-6 text-rn-danger-ink"
              valueClassName={
                revenue.churnRate30d > 0 ? "text-destructive" : "text-success"
              }
            />
            <OverviewKpiTile
              label={t("admin.prove_betalt_30_d")}
              value={`${revenue.trialConversionRate30d}%`}
              href={adminSubscriptionsHref("trialing")}
              goToLabel={goTo(t("admin.prove_betalt_30_d"))}
              icon={UserCheck}
            />
          </div>
        </section>

        <section
          className={cn("border-t border-rn-border-strong/50", sectionPad)}
          aria-label={t("admin.plattformaktivitet")}
        >
          <OverviewSectionIntro
            title={t("admin.plattformaktivitet")}
            description={t("admin.brukere_bookinger_og_nye_leietakere_siste_periode")}
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <OverviewKpiTile
              label={t("admin.brukere")}
              value={stats.userCount}
              href={adminRoutes.users}
              goToLabel={goTo(t("admin.brukere"))}
              icon={Users}
            />
            <OverviewKpiTile
              label={t("admin.aktive_brukere_30_d")}
              value={stats.activeUsers30d}
              href={adminUsersHref()}
              hint={t("admin.unike_innlogginger")}
              goToLabel={goTo(t("admin.aktive_brukere_30_d"))}
              icon={UserCheck}
            />
            <OverviewKpiTile
              label={t("admin.bookinger_30_d")}
              value={stats.bookingsLast30Days}
              href={adminRoutes.revenue}
              hint={t("admin.overview_inquiries_same_period", {
                count: stats.inquiriesLast30Days,
              })}
              goToLabel={goTo(t("admin.bookinger_30_d"))}
              icon={CalendarCheck}
            />
            <OverviewKpiTile
              label={t("admin.nye_leietakere_7_d")}
              value={stats.newOrganizationsLast7Days}
              href={adminSubscriptionsHref("trialing")}
              icon={Building2}
              goToLabel={goTo(t("admin.nye_leietakere_7_d"))}
              hint={
                stats.suspendedCount > 0
                  ? t("admin.overview_suspended_count", {
                      count: stats.suspendedCount,
                    })
                  : t("admin.registrert_siste_7_dager")
              }
            />
          </div>
        </section>

        <section
          className={cn("border-t border-rn-border-strong/50", sectionPad)}
          aria-label={t("admin.trender")}
        >
          <OverviewSectionIntro
            title={t("admin.trender")}
            description={t("admin.estimert_mrr_gjennom_aret_og_nye_leietakere_per_dag_siste_uk")}
          />
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-rn-border-strong/50">
            <div className="lg:pr-8">
              <AdminTrendChart
                className="admin-overview-trend-chart"
                embedded
                title={t("admin.inntektstrend_est_mrr")}
                subtitle={t("admin.aktive_provende_og_forfalte_ekskl_suspenderte")}
                periodHint={t("admin.overview_period_hint", {
                  year: chartYear,
                  amount: formatNok(currentMonthMrr),
                })}
                points={stats.revenueTrend}
                valueFormat="nok"
              />
            </div>
            <div className="lg:pl-8">
              <AdminTrendChart
                className="admin-overview-trend-chart"
                embedded
                title={t("admin.nye_leietakere_7_d")}
                subtitle={t("admin.organisasjoner_registrert_per_dag")}
                periodHint={t("admin.overview_last_7_days_total", {
                  count: stats.newOrganizationsLast7Days,
                })}
                points={stats.newTenantsTrend}
              />
            </div>
          </div>
        </section>

        <section
          className="grid border-t border-rn-border-strong/50 lg:grid-cols-2"
          aria-label={t("admin.abonnement_og_oppfolging")}
        >
          <div className="border-b border-rn-border-strong/50 px-4 py-5 sm:px-5 md:px-6 lg:border-r lg:border-b-0 lg:px-8 lg:py-6">
            <AdminSubscriptionStatusPanel embedded statusCounts={stats.statusCounts} />
          </div>
          <div className="px-4 py-5 sm:px-5 md:px-6 lg:px-8 lg:py-6">
            <AdminQueuePanel
              embedded
              title={t("admin.proveperiode_utloper_snart")}
              items={stats.trialExpiringQueue}
              emptyLabel={t("admin.ingen_proveperioder_utloper_innen_14_dager")}
              viewAllHref={adminSubscriptionsHref("trialing")}
            />
          </div>
        </section>
      </div>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <section className={sectionPad} aria-label={t("admin.koer_som_krever_handling")}>
          <OverviewSectionIntro
            title={t("admin.oppfolging")}
            description={t("admin.organisasjoner_som_trenger_manuell_oppfolging")}
          />
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <AdminQueuePanel
              embedded
              title={t("admin.forfalt_betaling")}
              items={stats.failedPaymentQueue}
              emptyLabel={t("admin.ingen_organisasjoner_med_forfalt_status")}
              viewAllHref={adminSubscriptionsHref("past_due")}
            />
            <AdminQueuePanel
              embedded
              title={t("admin.suspenderte_organisasjoner")}
              items={stats.suspendedOrganizations}
              emptyLabel={t("admin.ingen_suspenderte_organisasjoner")}
              viewAllHref={adminOrganizationsHref({ status: "suspended" })}
            />
          </div>
        </section>
      </div>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <section className={sectionPad} aria-label={t("admin.nylig_aktivitet")}>
          <OverviewSectionIntro
            title={t("admin.nylig_aktivitet")}
            description={t("admin.siste_registreringer_og_admin_handlinger")}
          />
          <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-10">
            <AdminDataPanel
              embedded
              className="admin-overview-data-panel min-w-0"
              title={t("admin.nylig_registrerte_organisasjoner")}
              action={
                <AdminLinkButton href={adminOrganizationsHref()}>{t("admin.alle_organisasjoner")}</AdminLinkButton>
              }
            >
              <div className="-mx-1 overflow-x-auto sm:mx-0">
                <Table>
                  <TableHeader className="bg-rn-surface-table-head [&_tr]:border-b-2 [&_tr]:border-rn-border-strong/70">
                    <TableRow>
                      <TableHead className={tableHeadClass}>{t("admin.overview_name")}</TableHead>
                      <TableHead className={tableHeadClass}>{t("admin.status")}</TableHead>
                      <TableHead className={cn(tableHeadClass, "hidden sm:table-cell")}>{t("admin.plan")}</TableHead>
                      <TableHead className={tableHeadClass}>{t("admin.overview_created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentOrganizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className={tableCellClass}>
                          <Link
                            href={adminRoutes.organizationDetail(org.id)}
                            className={RN_ADMIN_DETAIL_LINK}
                          >
                            {org.name}
                          </Link>
                        </TableCell>
                        <TableCell className={tableCellClass}>
                          <AdminStatusBadge status={org.subscriptionStatus} />
                        </TableCell>
                        <TableCell
                          className={cn(tableCellClass, "hidden sm:table-cell")}
                        >
                          <AdminPlanBadge plan={org.subscriptionPlan} />
                        </TableCell>
                        <TableCell
                          className={cn(
                            tableCellClass,
                            "text-muted-foreground tabular-nums",
                          )}
                        >
                          {format(new Date(org.createdAt), "d. MMM yyyy", {
                            locale: getDateFnsLocale(locale),
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {stats.recentOrganizations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className={cn(
                            tableCellClass,
                            "py-8 text-center app-text-muted",
                          )}
                        >
                          {t("admin.overview_no_orgs_yet")}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </AdminDataPanel>

            <AdminDataPanel
              embedded
              className="admin-overview-data-panel min-w-0"
              title={t("admin.siste_admin_handlinger")}
              action={
                <AdminLinkButton href={adminRoutes.audit}>
                  {t("admin.overview_full_audit_log")}
                </AdminLinkButton>
              }
            >
              <div className="-mx-1 overflow-x-auto sm:mx-0">
                <Table>
                  <TableHeader className="bg-rn-surface-table-head [&_tr]:border-b-2 [&_tr]:border-rn-border-strong/70">
                    <TableRow>
                      <TableHead className={tableHeadClass}>{t("admin.overview_timestamp")}</TableHead>
                      <TableHead className={cn(tableHeadClass, "hidden md:table-cell")}>
                        {t("admin.overview_admin")}
                      </TableHead>
                      <TableHead className={tableHeadClass}>{t("admin.overview_action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentAuditEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell
                          className={cn(
                            tableCellClass,
                            "text-muted-foreground tabular-nums whitespace-nowrap",
                          )}
                        >
                          {format(new Date(entry.createdAt), "d. MMM HH:mm", {
                            locale: getDateFnsLocale(locale),
                          })}
                        </TableCell>
                        <TableCell
                          className={cn(
                            tableCellClass,
                            "hidden md:table-cell",
                          )}
                        >
                          {entry.actorName ?? "—"}
                        </TableCell>
                        <TableCell className={tableCellClass}>
                          <span className="font-heading text-app-sm font-semibold">
                            {formatAuditActionLabel(entry.action, t)}
                          </span>
                          <span className="mt-0.5 block font-mono text-app-xs text-muted-foreground">
                            {entry.targetId ?? entry.targetType}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {stats.recentAuditEntries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className={cn(
                            tableCellClass,
                            "py-8 text-center app-text-muted",
                          )}
                        >
                          {t("admin.overview_no_events_yet")}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </AdminDataPanel>
          </div>
        </section>
      </div>
    </div>
  );
}
