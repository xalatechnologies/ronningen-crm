import {
  AdminPlanBadge,
  AdminStatCard,
  AdminStatusBadge,
} from "@/components/admin/admin-badges";
import { AdminLinkButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminQueuePanel } from "@/components/admin/admin-queue-panel";
import { AdminSubscriptionStatusPanel } from "@/components/admin/admin-subscription-status-panel";
import { AdminTrendChart } from "@/components/admin/admin-trend-chart";
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
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const stats = await fetchAdminOverviewStats();
  const { revenue } = stats;

  return (
    <AdminPageShell
      title="Plattformoversikt"
      description="SaaS-KPIer, køer og nylig aktivitet på tvers av alle organisasjoner."
    >
      <AdminKpiGrid>
        <AdminStatCard
          label="Organisasjoner"
          value={stats.organizationCount}
          href={adminOrganizationsHref()}
        />
        <AdminStatCard
          label="MRR (est.)"
          value={formatNok(revenue.mrrNok)}
          href={adminRoutes.revenue}
          hint={
            revenue.trialingSubscriptions > 0 ? (
              <span>
                {revenue.trialingSubscriptions} i prøve · pot.{" "}
                {formatNok(revenue.potentialMrrNok)}
              </span>
            ) : undefined
          }
        />
        <AdminStatCard
          label="Churn (30 d.)"
          value={`${revenue.churnRate30d}%`}
          href={adminSubscriptionsHref("canceled")}
        />
        <AdminStatCard
          label="Prøve → betalt (30 d.)"
          value={`${revenue.trialConversionRate30d}%`}
          href={adminSubscriptionsHref("trialing")}
        />
      </AdminKpiGrid>

      <div className="grid lg:grid-cols-2">
        <AdminTrendChart
          title="Inntektstrend (est. MRR)"
          points={stats.revenueTrend}
          valueFormat="nok"
        />
        <AdminTrendChart
          title="Nye leietakere (7 d.)"
          points={stats.newTenantsTrend}
        />
      </div>

      <div className="grid lg:grid-cols-2">
        <AdminSubscriptionStatusPanel statusCounts={stats.statusCounts} />

        <AdminQueuePanel
          title="Prøveperiode utløper snart"
          items={stats.trialExpiringQueue}
          emptyLabel="Ingen prøveperioder utløper innen 14 dager."
          viewAllHref={adminSubscriptionsHref("trialing")}
        />
      </div>

      <div className="grid lg:grid-cols-2">
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
        title="Nylig registrerte organisasjoner"
        action={
          <AdminLinkButton href={adminOrganizationsHref()}>
            Alle organisasjoner
          </AdminLinkButton>
        }
      >
        <Table className="admin-ops-table">
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Opprettet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.recentOrganizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <Link
                    href={adminRoutes.organizationDetail(org.id)}
                    className="font-heading font-semibold text-success hover:underline"
                  >
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <AdminStatusBadge status={org.subscriptionStatus} />
                </TableCell>
                <TableCell>
                  <AdminPlanBadge plan={org.subscriptionPlan} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(org.createdAt), "d. MMM yyyy", {
                    locale: nb,
                  })}
                </TableCell>
              </TableRow>
            ))}
            {stats.recentOrganizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center app-text-muted">
                  Ingen organisasjoner registrert ennå.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </AdminDataPanel>

      <AdminDataPanel
        title="Siste admin-handlinger"
        action={
          <AdminLinkButton href={adminRoutes.audit}>Full revisjonslogg</AdminLinkButton>
        }
      >
        <Table className="admin-ops-table">
          <TableHeader>
            <TableRow>
              <TableHead>Tidspunkt</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Handling</TableHead>
              <TableHead>Mål</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.recentAuditEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">
                  {format(new Date(entry.createdAt), "d. MMM yyyy HH:mm", {
                    locale: nb,
                  })}
                </TableCell>
                <TableCell>{entry.actorName ?? "—"}</TableCell>
                <TableCell>
                  <span className="font-heading text-app-sm font-semibold">
                    {formatAuditActionLabel(entry.action)}
                  </span>
                  <span className="mt-0.5 block font-mono text-app-xs text-muted-foreground">
                    {entry.action}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-app-xs text-muted-foreground">
                  {entry.targetId ?? entry.targetType}
                </TableCell>
              </TableRow>
            ))}
            {stats.recentAuditEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center app-text-muted">
                  Ingen hendelser ennå.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </AdminDataPanel>
    </AdminPageShell>
  );
}
