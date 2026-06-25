import { OrganizationDetailKpiCard } from "@/components/admin/organization-detail/organization-detail-kpi-card";
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
      <OrganizationDetailKpiCard label="Medlemmer" value={org.members.length} />
      <OrganizationDetailKpiCard
        label="Omsetning"
        value={formatNok(org.totalRevenue)}
      />
      <OrganizationDetailKpiCard
        label="Utestående"
        value={formatNok(org.unpaidRemaining)}
      />
      <OrganizationDetailKpiCard
        label="Reservasjoner (30d)"
        value={org.bookingsLast30d}
      />
    </AdminKpiGrid>
  );
}
