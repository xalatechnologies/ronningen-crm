"use client";

import { useTranslation } from "@/i18n/client";
import { AdminStatCard } from "@/components/admin/admin-badges";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { formatNok } from "@/lib/admin/revenue-metrics";

export function OrganizationUsageTab({ org }: { org: AdminOrganizationDetail }) {
  const { t } = useTranslation();
  return (
    <AdminDataPanel title={t("admin.bruk")}>
      <AdminKpiGrid>
        <AdminStatCard label={t("admin.reservasjoner")} value={org.bookingCount} />
        <AdminStatCard label={t("admin.foresporsler")} value={org.inquiryCount} />
        <AdminStatCard label={t("admin.kunder")} value={org.customerCount} />
        <AdminStatCard label={t("admin.omsetning")} value={formatNok(org.totalRevenue)} />
        <AdminStatCard
          label={t("admin.utestaende")}
          value={formatNok(org.unpaidRemaining)}
        />
        <AdminStatCard
          label={t("admin.reservasjoner_30d")}
          value={org.bookingsLast30d}
        />
      </AdminKpiGrid>
    </AdminDataPanel>
  );
}
