import {
  AdminPlanBadge,
  AdminStatusBadge,
} from "@/components/admin/admin-badges";
import { AdminLinkButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminQueuePanel } from "@/components/admin/admin-queue-panel";
import { AdminSubscriptionStatusPanel } from "@/components/admin/admin-subscription-status-panel";
import { AdminTrendChart } from "@/components/admin/admin-trend-chart";
import { NewTenantsMonthChart } from "@/components/admin/new-tenants-month-chart";
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
import { APP_TABLE_HEAD } from "@/lib/table-typography";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Building2,
  CalendarCheck,
  ChevronRight,
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
  "px-5 py-5 sm:px-6 sm:py-6";

const kpiTileClass =
  "admin-overview-kpi-tile flex min-h-[length:var(--app-tap-target-min)] flex-col justify-start gap-1 rounded-2xl bg-muted/40 p-5 ring-1 ring-foreground/10 dark:bg-white/[0.06] sm:p-6";

const tableHeadClass = cn(
  "admin-overview-table-head",
  APP_TABLE_HEAD,
  "px-4 text-app-xs font-semibold tracking-wide text-muted-foreground sm:px-5",
);
const tableCellClass =
  "px-4 py-3 sm:px-5";

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

function OverviewSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
      <section className={sectionPad} aria-label={title}>
        <OverviewSectionIntro title={title} description={description} />
        <div className="mt-5">{children}</div>
      </section>
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
  iconContainerClassName = "rounded-xl bg-accent p-2 dark:bg-white/10",
  iconClassName = "size-6 text-primary dark:text-white",
  valueClassName = "text-success",
  compact = false,
}: {
  /** Secondary figures: smaller number, no icon block. */
  compact?: boolean;
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
        "group relative transition-colors hover:bg-muted/60 hover:ring-success/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="dashboard-kpi-label min-w-0 break-words !normal-case !tracking-normal">{label}</span>
        {compact ? (
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <div className={cn(iconContainerClassName, "shrink-0")}>
            <Icon className={iconClassName} aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className={cn("dashboard-kpi-value break-words", compact && "!text-3xl", valueClassName)}>
          {value}
        </p>
        {hint ? (
          <p className="dashboard-kpi-caption mt-2 text-muted-foreground dark:text-foreground/75 sm:mt-3">
            {hint}
          </p>
        ) : null}
      </div>
      <span className="sr-only">{goToLabel}</span>
      <ChevronRight
        className="absolute right-3 bottom-3 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      />
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

  const orgHint =
    trialingCount > 0
      ? t("admin.overview_trialing_active", {
          trialing: trialingCount,
          active: activeCount,
        })
      : t("admin.overview_active_subscriptions", { count: activeCount });

  const mrrHeadline = revenue.mrrNok;
  const mrrHint =
    revenue.potentialMrrNok > revenue.mrrNok
      ? t("admin.overview_mrr_potential", { amount: formatNok(revenue.potentialMrrNok) })
      : t("admin.ingen_aktive_eller_provende_abonnement");
  const churn = revenue.churnRate30d;

  return (
    <div className="admin-page-workspace admin-overview-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-6 pb-8">
      <AppPageHeader
        className="mb-0"
        surface="default"
        compact
        title={t("admin.plattformoversikt")}
        description={t("admin.saas_kpier_trender_og_koer_pa_tvers_av_alle_organisasjoner")}
      />

      <OverviewSection
        title={t("admin.abonnement_og_inntekt")}
        description={t("admin.mrr_churn_og_konvertering_fra_prove_til_betalt")}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          <OverviewKpiTile
            label={t("admin.mrr_est")}
            value={formatNok(mrrHeadline)}
            href={adminRoutes.revenue}
            hint={mrrHint}
            goToLabel={goTo(t("admin.mrr_est"))}
            icon={TrendingUp}
            valueClassName={mrrHeadline > 0 ? "text-success" : "text-foreground"}
          />
          <OverviewKpiTile
            label={t("admin.organisasjoner")}
            value={stats.organizationCount}
            href={adminOrganizationsHref()}
            hint={orgHint}
            goToLabel={goTo(t("admin.organisasjoner"))}
            icon={Building2}
            valueClassName="text-foreground"
          />
          <OverviewKpiTile
            label={t("admin.churn_30_d")}
            value={churn === null ? "\u2014" : `${churn}%`}
            href={adminSubscriptionsHref("canceled")}
            hint={churn === null ? t("admin.overview_churn_none") : undefined}
            goToLabel={goTo(t("admin.churn_30_d"))}
            icon={TrendingDown}
            iconContainerClassName="rounded-md bg-rn-danger-soft p-2"
            iconClassName="size-6 text-rn-danger-ink"
            valueClassName={churn !== null && churn > 0 ? "text-destructive" : "text-foreground"}
          />
          <OverviewKpiTile
            label={t("admin.prove_betalt_30_d")}
            value={`${revenue.trialConversionRate30d}%`}
            href={adminSubscriptionsHref("trialing")}
            goToLabel={goTo(t("admin.prove_betalt_30_d"))}
            icon={UserCheck}
            valueClassName="text-foreground"
          />
        </div>
      </OverviewSection>

      <OverviewSection
        title={t("admin.overview_attention")}
        description={t("admin.overview_attention_desc")}
      >
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
          <AdminQueuePanel
            embedded
            title={t("admin.forfalt_betaling")}
            items={stats.failedPaymentQueue}
            emptyLabel={t("admin.ingen_organisasjoner_med_forfalt_status")}
            viewAllHref={adminSubscriptionsHref("past_due")}
          />
          <AdminQueuePanel
            embedded
            title={t("admin.proveperiode_utloper_snart")}
            items={stats.trialExpiringQueue}
            emptyLabel={t("admin.ingen_proveperioder_utloper_innen_14_dager")}
            viewAllHref={adminSubscriptionsHref("trialing")}
          />
          <div className="md:col-span-2">
            <AdminQueuePanel
              embedded
              title={t("admin.suspenderte_organisasjoner")}
              items={stats.suspendedOrganizations}
              emptyLabel={t("admin.ingen_suspenderte_organisasjoner")}
              viewAllHref={adminOrganizationsHref({ status: "suspended" })}
            />
          </div>
        </div>
      </OverviewSection>

      <OverviewSection
        title={t("admin.plattformaktivitet")}
        description={t("admin.brukere_bookinger_og_nye_leietakere_siste_periode")}
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <OverviewKpiTile
            compact
            label={t("admin.brukere")}
            value={stats.userCount}
            href={adminRoutes.users}
            goToLabel={goTo(t("admin.brukere"))}
            icon={Users}
            valueClassName="text-foreground"
          />
          <OverviewKpiTile
            compact
            label={t("admin.aktive_brukere_30_d")}
            value={stats.activeUsers30d}
            href={adminUsersHref()}
            hint={t("admin.unike_innlogginger")}
            goToLabel={goTo(t("admin.aktive_brukere_30_d"))}
            icon={UserCheck}
            valueClassName="text-foreground"
          />
          <OverviewKpiTile
            compact
            label={t("admin.bookinger_30_d")}
            value={stats.bookingsLast30Days}
            href={adminRoutes.revenue}
            hint={t("admin.overview_inquiries_same_period", { count: stats.inquiriesLast30Days })}
            goToLabel={goTo(t("admin.bookinger_30_d"))}
            icon={CalendarCheck}
            valueClassName="text-foreground"
          />
          <OverviewKpiTile
            compact
            label={t("admin.nye_leietakere_30_d")}
            value={stats.newOrganizationsLast30Days}
            href={adminSubscriptionsHref("trialing")}
            icon={Building2}
            goToLabel={goTo(t("admin.nye_leietakere_30_d"))}
            valueClassName="text-foreground"
            hint={
              stats.suspendedCount > 0
                ? t("admin.overview_suspended_count", { count: stats.suspendedCount })
                : t("admin.registrert_siste_30_dager")
            }
          />
        </div>
      </OverviewSection>

      <OverviewSection
        title={t("admin.trender")}
        description={t("admin.estimert_mrr_gjennom_aret_og_nye_leietakere_per_dag_siste_uk")}
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <AdminTrendChart
            className="admin-overview-trend-chart"
            embedded
            title={t("admin.inntektstrend_est_mrr")}
            subtitle={t("admin.aktive_provende_og_forfalte_ekskl_suspenderte")}
            periodHint={t("admin.overview_period_hint", { year: chartYear, amount: formatNok(currentMonthMrr) })}
            points={stats.revenueTrend}
            valueFormat="nok"
          />
          <NewTenantsMonthChart createdAts={stats.newTenantCreatedAts} />
        </div>
      </OverviewSection>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL, sectionPad)}>
        <AdminSubscriptionStatusPanel embedded statusCounts={stats.statusCounts} />
      </div>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <section className={sectionPad} aria-label={t("admin.nylig_aktivitet")}>
          <OverviewSectionIntro
            title={t("admin.nylig_aktivitet")}
            description={t("admin.siste_registreringer_og_admin_handlinger")}
          />
          <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <AdminDataPanel
              embedded
              className="admin-overview-data-panel min-w-0"
              title={t("admin.nylig_registrerte_organisasjoner")}
              action={
                <AdminLinkButton href={adminOrganizationsHref()}>{t("admin.alle_organisasjoner")}</AdminLinkButton>
              }
            >
              <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
                <Table>
                  <TableHeader className="bg-muted/50 [&_tr]:border-b [&_tr]:border-foreground/15">
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
              <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
                <Table>
                  <TableHeader className="bg-muted/50 [&_tr]:border-b [&_tr]:border-foreground/15">
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
