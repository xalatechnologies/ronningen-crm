import { AdminStatCard } from "@/components/admin/admin-badges";
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { formatNok } from "@/lib/admin/revenue-metrics";

export function OrganizationDetailKpiStrip({
  org,
}: {
  org: AdminOrganizationDetail;
}) {
  return (
    <AdminKpiGrid>
      <AdminStatCard label="Medlemmer" value={org.members.length} />
      <AdminStatCard label="Omsetning" value={formatNok(org.totalRevenue)} />
      <AdminStatCard
        label="Utestående"
        value={formatNok(org.unpaidRemaining)}
      />
      <AdminStatCard
        label="Reservasjoner (30d)"
        value={org.bookingsLast30d}
      />
    </AdminKpiGrid>
  );
}
