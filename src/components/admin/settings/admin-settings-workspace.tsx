"use client";

import {
  AdminDetailTabPanel,
} from "@/components/admin/admin-detail-tab-bar";
import { AdminSettingsHeader } from "@/components/admin/settings/admin-settings-header";
import { AdminSettingsKpiStrip } from "@/components/admin/settings/admin-settings-kpi-strip";
import { AccessPanel } from "@/components/admin/settings/panels/access-panel";
import { CommercialPanel } from "@/components/admin/settings/panels/commercial-panel";
import { EnvironmentPanel } from "@/components/admin/settings/panels/environment-panel";
import { IntegrationsPanel } from "@/components/admin/settings/panels/integrations-panel";
import { useAdminSettingsTab } from "@/components/admin/settings/use-admin-settings-tab";
import type { AdminSettingsOverview } from "@/lib/admin/queries/settings";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

export function AdminSettingsWorkspace({
  settings,
}: {
  settings: AdminSettingsOverview;
}) {
  const { tab, setTab } = useAdminSettingsTab();

  return (
    <div className="admin-page-workspace admin-settings-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-6 pb-8">
      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-5 py-5 sm:px-6 lg:px-6">
          <AdminSettingsHeader
            settings={settings}
            tab={tab}
            onTabChange={setTab}
          />
        </div>
      </div>

      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <AdminSettingsKpiStrip settings={settings} activeTab={tab} />
      </div>

      <div className="min-w-0">
          <AdminDetailTabPanel tabId="integrations" activeTab={tab}>
            <IntegrationsPanel settings={settings} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="commercial" activeTab={tab}>
            <CommercialPanel settings={settings} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="access" activeTab={tab}>
            <AccessPanel settings={settings} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="environment" activeTab={tab}>
            <EnvironmentPanel settings={settings} />
          </AdminDetailTabPanel>
      </div>
    </div>
  );
}
