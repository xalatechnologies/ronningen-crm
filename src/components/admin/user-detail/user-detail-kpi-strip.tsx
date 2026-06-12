import { AdminStatCard } from "@/components/admin/admin-badges";
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid";
import type { AdminUserDetail } from "@/lib/admin/queries/users-billing-audit";

export function UserDetailKpiStrip({ user }: { user: AdminUserDetail }) {
  return (
    <AdminKpiGrid>
      <AdminStatCard
        label="Organisasjoner"
        value={user.organizations.length}
      />
      <AdminStatCard
        label="Kontostatus"
        value={user.isDisabled ? "Deaktivert" : "Aktiv"}
      />
      <AdminStatCard
        label="Plattformadmin"
        value={user.isPlatformAdmin ? "Ja" : "Nei"}
      />
      <AdminStatCard
        label="Revisjonsposter"
        value={user.auditEntries.length}
      />
    </AdminKpiGrid>
  );
}
