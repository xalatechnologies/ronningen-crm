import { AdminStatCard } from "@/components/admin/admin-badges";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { formatNok } from "@/lib/admin/revenue-metrics";

export function OrganizationUsageTab({ org }: { org: AdminOrganizationDetail }) {
  return (
    <AdminDataPanel title="Bruk">
      <AdminKpiGrid>
        <AdminStatCard label="Reservasjoner" value={org.bookingCount} />
        <AdminStatCard label="Forespørsler" value={org.inquiryCount} />
        <AdminStatCard label="Kunder" value={org.customerCount} />
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
    </AdminDataPanel>
  );
}
