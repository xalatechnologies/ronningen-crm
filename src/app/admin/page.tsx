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
import { nb } from "date-fns/locale/nb";
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
      <span className="sr-only">Gå til {label}</span>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const stats = await fetchAdminOverviewStats();
  const { revenue } = stats;
  const chartYear = new Date().getFullYear();
  const trialingCount = revenue.trialingSubscriptions;
  const activeCount = revenue.activeSubscriptions;
  const estimatedMrrNok = revenue.potentialMrrNok;
  const currentMonthMrr =
    stats.revenueTrend[new Date().getMonth()]?.value ?? estimatedMrrNok;

  const mrrHint =
    revenue.mrrNok > 0 ? (
      <span>
        {formatNok(revenue.mrrNok)} realizert
        {trialingCount > 0 ? ` · ${trialingCount} i prøve` : ""}
      </span>
    ) : trialingCount > 0 ? (
      <span>
        {trialingCount} i prøve · {activeCount} aktive betalere
      </span>
    ) : (
      "Ingen aktive eller prøvende abonnement"
    );

  const orgHint =
    trialingCount > 0
      ? `${trialingCount} i prøve · ${activeCount} aktive`
      : `${activeCount} aktive abonnement`;

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
            title="Plattformoversikt"
            description="SaaS-KPIer, trender og køer på tvers av alle organisasjoner."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <AdminLinkButton href={adminRoutes.revenue}>
                  Inntekt
                </AdminLinkButton>
                <AdminLinkButton href={adminSubscriptionsHref()}>
                  Abonnement
                </AdminLinkButton>
                <AdminLinkButton href={adminOrganizationsHref()}>
                  Organisasjoner
                </AdminLinkButton>
              </div>
            }
          />
        </div>

        <section
          className={cn("border-t border-rn-border-strong/50", sectionPad)}
          aria-label="Abonnement og inntekt"
        >
          <OverviewSectionIntro
            title="Abonnement og inntekt"
            description="MRR, churn og konvertering fra prøve til betalt."
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <OverviewKpiTile
              label="Organisasjoner"
              value={stats.organizationCount}
              href={adminOrganizationsHref()}
              hint={orgHint}
              icon={Building2}
            />
            <OverviewKpiTile
              label="MRR (est.)"
              value={formatNok(estimatedMrrNok)}
              href={adminRoutes.revenue}
              hint={mrrHint}
              icon={TrendingUp}
              valueClassName={
                estimatedMrrNok > 0 ? "text-success" : "text-foreground"
              }
            />
            <OverviewKpiTile
              label="Churn (30 d.)"
              value={`${revenue.churnRate30d}%`}
              href={adminSubscriptionsHref("canceled")}
              icon={TrendingDown}
              iconContainerClassName="rounded-md bg-rn-danger-soft p-2"
              iconClassName="size-6 text-rn-danger-ink"
              valueClassName={
                revenue.churnRate30d > 0 ? "text-destructive" : "text-success"
              }
            />
            <OverviewKpiTile
              label="Prøve → betalt (30 d.)"
              value={`${revenue.trialConversionRate30d}%`}
              href={adminSubscriptionsHref("trialing")}
              icon={UserCheck}
            />
          </div>
        </section>

        <section
          className={cn("border-t border-rn-border-strong/50", sectionPad)}
          aria-label="Plattformaktivitet"
        >
          <OverviewSectionIntro
            title="Plattformaktivitet"
            description="Brukere, bookinger og nye leietakere siste periode."
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <OverviewKpiTile
              label="Brukere"
              value={stats.userCount}
              href={adminRoutes.users}
              icon={Users}
            />
            <OverviewKpiTile
              label="Aktive brukere (30 d.)"
              value={stats.activeUsers30d}
              href={adminUsersHref()}
              hint="Unike innlogginger"
              icon={UserCheck}
            />
            <OverviewKpiTile
              label="Bookinger (30 d.)"
              value={stats.bookingsLast30Days}
              href={adminRoutes.revenue}
              hint={`${stats.inquiriesLast30Days} forespørsler samme periode`}
              icon={CalendarCheck}
            />
            <OverviewKpiTile
              label="Nye leietakere (7 d.)"
              value={stats.newOrganizationsLast7Days}
              href={adminSubscriptionsHref("trialing")}
              icon={Building2}
              hint={
                stats.suspendedCount > 0
                  ? `${stats.suspendedCount} suspendert`
                  : "Registrert siste 7 dager"
              }
            />
          </div>
        </section>

        <section
          className={cn("border-t border-rn-border-strong/50", sectionPad)}
          aria-label="Trender"
        >
          <OverviewSectionIntro
            title="Trender"
            description="Estimert MRR gjennom året og nye leietakere per dag siste uke."
          />
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-rn-border-strong/50">
            <div className="lg:pr-8">
              <AdminTrendChart
                className="admin-overview-trend-chart"
                embedded
                title="Inntektstrend (est. MRR)"
                subtitle="Aktive, prøvende og forfalte — ekskl. suspenderte."
                periodHint={`${chartYear} · ${formatNok(currentMonthMrr)} denne måneden`}
                points={stats.revenueTrend}
                valueFormat="nok"
              />
            </div>
            <div className="lg:pl-8">
              <AdminTrendChart
                className="admin-overview-trend-chart"
                embedded
                title="Nye leietakere (7 d.)"
                subtitle="Organisasjoner registrert per dag."
                periodHint={`Siste 7 dager · ${stats.newOrganizationsLast7Days} totalt`}
                points={stats.newTenantsTrend}
              />
            </div>
          </div>
        </section>

        <section
          className="grid border-t border-rn-border-strong/50 lg:grid-cols-2"
          aria-label="Abonnement og oppfølging"
        >
          <div className="border-b border-rn-border-strong/50 px-4 py-5 sm:px-5 md:px-6 lg:border-r lg:border-b-0 lg:px-8 lg:py-6">
            <AdminSubscriptionStatusPanel embedded statusCounts={stats.statusCounts} />
          </div>
          <div className="px-4 py-5 sm:px-5 md:px-6 lg:px-8 lg:py-6">
            <AdminQueuePanel
              embedded
              title="Prøveperiode utløper snart"
              items={stats.trialExpiringQueue}
              emptyLabel="Ingen prøveperioder utløper innen 14 dager."
              viewAllHref={adminSubscriptionsHref("trialing")}
            />
          </div>
        </section>
      </div>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <section className={sectionPad} aria-label="Køer som krever handling">
          <OverviewSectionIntro
            title="Oppfølging"
            description="Organisasjoner som trenger manuell oppfølging."
          />
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <AdminQueuePanel
              embedded
              title="Forfalt betaling"
              items={stats.failedPaymentQueue}
              emptyLabel="Ingen organisasjoner med forfalt status."
              viewAllHref={adminSubscriptionsHref("past_due")}
            />
            <AdminQueuePanel
              embedded
              title="Suspenderte organisasjoner"
              items={stats.suspendedOrganizations}
              emptyLabel="Ingen suspenderte organisasjoner."
              viewAllHref={adminOrganizationsHref({ status: "suspended" })}
            />
          </div>
        </section>
      </div>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <section className={sectionPad} aria-label="Nylig aktivitet">
          <OverviewSectionIntro
            title="Nylig aktivitet"
            description="Siste registreringer og admin-handlinger."
          />
          <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-10">
            <AdminDataPanel
              embedded
              className="admin-overview-data-panel min-w-0"
              title="Nylig registrerte organisasjoner"
              action={
                <AdminLinkButton href={adminOrganizationsHref()}>
                  Alle organisasjoner
                </AdminLinkButton>
              }
            >
              <div className="-mx-1 overflow-x-auto sm:mx-0">
                <Table>
                  <TableHeader className="bg-rn-surface-table-head [&_tr]:border-b-2 [&_tr]:border-rn-border-strong/70">
                    <TableRow>
                      <TableHead className={tableHeadClass}>Navn</TableHead>
                      <TableHead className={tableHeadClass}>Status</TableHead>
                      <TableHead className={cn(tableHeadClass, "hidden sm:table-cell")}>
                        Plan
                      </TableHead>
                      <TableHead className={tableHeadClass}>Opprettet</TableHead>
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
                            locale: nb,
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
                          Ingen organisasjoner registrert ennå.
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
              title="Siste admin-handlinger"
              action={
                <AdminLinkButton href={adminRoutes.audit}>
                  Full revisjonslogg
                </AdminLinkButton>
              }
            >
              <div className="-mx-1 overflow-x-auto sm:mx-0">
                <Table>
                  <TableHeader className="bg-rn-surface-table-head [&_tr]:border-b-2 [&_tr]:border-rn-border-strong/70">
                    <TableRow>
                      <TableHead className={tableHeadClass}>Tidspunkt</TableHead>
                      <TableHead className={cn(tableHeadClass, "hidden md:table-cell")}>
                        Admin
                      </TableHead>
                      <TableHead className={tableHeadClass}>Handling</TableHead>
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
                            locale: nb,
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
                            {formatAuditActionLabel(entry.action)}
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
                          Ingen hendelser ennå.
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
