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
} from "@/lib/admin/dashboard-links";
import { fetchAdminOverviewStats } from "@/lib/admin/queries/overview";
import { formatNok } from "@/lib/admin/revenue-metrics";
import { RN_ADMIN_DETAIL_LINK, RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";
import {
  Building2,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const kpiTileClass =
  "flex flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-6 shadow-sm";

const tableHeadClass =
  "px-6 py-4 text-app-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 md:px-8 md:py-6";

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
      <div className="mb-3 flex items-start justify-between">
        <span className="dashboard-kpi-label">{label}</span>
        <div className={iconContainerClassName}>
          <Icon className={iconClassName} aria-hidden />
        </div>
      </div>
      <div>
        <p className={cn("dashboard-kpi-value", valueClassName)}>{value}</p>
        {hint ? (
          <p className="dashboard-kpi-caption mt-3 text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <span className="sr-only">Gå til {label}</span>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const stats = await fetchAdminOverviewStats();
  const { revenue } = stats;

  const mrrHint =
    revenue.trialingSubscriptions > 0 ? (
      <span>
        {revenue.trialingSubscriptions} i prøve · pot.{" "}
        {formatNok(revenue.potentialMrrNok)}
      </span>
    ) : undefined;

  return (
    <div className="admin-page-workspace admin-overview-dashboard mx-auto flex w-full min-w-0 flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title="Plattformoversikt"
            description="SaaS-KPIer, køer og nylig aktivitet på tvers av alle organisasjoner."
          />
        </div>
        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 md:py-6"
          aria-label="Nøkkeltall"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <OverviewKpiTile
              label="Organisasjoner"
              value={stats.organizationCount}
              href={adminOrganizationsHref()}
              icon={Building2}
            />
            <OverviewKpiTile
              label="MRR (est.)"
              value={formatNok(revenue.mrrNok)}
              href={adminRoutes.revenue}
              hint={mrrHint}
              icon={TrendingUp}
            />
            <OverviewKpiTile
              label="Churn (30 d.)"
              value={`${revenue.churnRate30d}%`}
              href={adminSubscriptionsHref("canceled")}
              icon={TrendingDown}
              iconContainerClassName="rounded-md bg-rn-danger-soft p-2"
              iconClassName="size-6 text-rn-danger-ink"
              valueClassName="text-destructive"
            />
            <OverviewKpiTile
              label="Prøve → betalt (30 d.)"
              value={`${revenue.trialConversionRate30d}%`}
              href={adminSubscriptionsHref("trialing")}
              icon={UserCheck}
            />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AdminTrendChart
          className="admin-overview-trend-chart"
          title="Inntektstrend (est. MRR)"
          points={stats.revenueTrend}
          valueFormat="nok"
        />
        <AdminTrendChart
          className="admin-overview-trend-chart"
          title="Nye leietakere (7 d.)"
          points={stats.newTenantsTrend}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AdminSubscriptionStatusPanel statusCounts={stats.statusCounts} />

        <AdminQueuePanel
          title="Prøveperiode utløper snart"
          items={stats.trialExpiringQueue}
          emptyLabel="Ingen prøveperioder utløper innen 14 dager."
          viewAllHref={adminSubscriptionsHref("trialing")}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AdminQueuePanel
          title="Forfalt betaling"
          items={stats.failedPaymentQueue}
          emptyLabel="Ingen organisasjoner med forfalt status."
          viewAllHref={adminSubscriptionsHref("past_due")}
        />
        <AdminQueuePanel
          title="Suspenderte organisasjoner"
          items={stats.suspendedOrganizations}
          emptyLabel="Ingen suspenderte organisasjoner."
          viewAllHref={adminOrganizationsHref({ status: "suspended" })}
        />
      </div>

      <AdminDataPanel
        className="admin-overview-data-panel"
        title="Nylig registrerte organisasjoner"
        action={
          <AdminLinkButton href={adminOrganizationsHref()}>
            Alle organisasjoner
          </AdminLinkButton>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={tableHeadClass}>Navn</TableHead>
              <TableHead className={tableHeadClass}>Status</TableHead>
              <TableHead className={tableHeadClass}>Plan</TableHead>
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
                <TableCell className={tableCellClass}>
                  <AdminPlanBadge plan={org.subscriptionPlan} />
                </TableCell>
                <TableCell className={cn(tableCellClass, "text-muted-foreground")}>
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
                  className={cn(tableCellClass, "py-8 text-center app-text-muted")}
                >
                  Ingen organisasjoner registrert ennå.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </AdminDataPanel>

      <AdminDataPanel
        className="admin-overview-data-panel"
        title="Siste admin-handlinger"
        action={
          <AdminLinkButton href={adminRoutes.audit}>Full revisjonslogg</AdminLinkButton>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={tableHeadClass}>Tidspunkt</TableHead>
              <TableHead className={tableHeadClass}>Admin</TableHead>
              <TableHead className={tableHeadClass}>Handling</TableHead>
              <TableHead className={tableHeadClass}>Mål</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.recentAuditEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className={cn(tableCellClass, "text-muted-foreground")}>
                  {format(new Date(entry.createdAt), "d. MMM yyyy HH:mm", {
                    locale: nb,
                  })}
                </TableCell>
                <TableCell className={tableCellClass}>
                  {entry.actorName ?? "—"}
                </TableCell>
                <TableCell className={tableCellClass}>
                  <span className="font-heading text-app-sm font-semibold">
                    {formatAuditActionLabel(entry.action)}
                  </span>
                  <span className="mt-0.5 block font-mono text-app-xs text-muted-foreground">
                    {entry.action}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    tableCellClass,
                    "font-mono text-app-xs text-muted-foreground",
                  )}
                >
                  {entry.targetId ?? entry.targetType}
                </TableCell>
              </TableRow>
            ))}
            {stats.recentAuditEntries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className={cn(tableCellClass, "py-8 text-center app-text-muted")}
                >
                  Ingen hendelser ennå.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </AdminDataPanel>
    </div>
  );
}
