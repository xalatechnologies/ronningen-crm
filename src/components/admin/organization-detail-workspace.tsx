"use client";

import "./organization-detail/organization-detail.css";

import { AdminDetailTabPanel } from "@/components/admin/admin-detail-tab-bar";
import { OrganizationBillingTab } from "@/components/admin/organization-detail/organization-billing-tab";
import { OrganizationDetailHeader } from "@/components/admin/organization-detail/organization-detail-header";
import { OrganizationDetailKpiStrip } from "@/components/admin/organization-detail/organization-detail-kpi-strip";
import { OrganizationMembersTab } from "@/components/admin/organization-detail/organization-members-tab";
import { OrganizationProfileTab } from "@/components/admin/organization-detail/organization-profile-tab";
import { OrganizationSubscriptionTab } from "@/components/admin/organization-detail/organization-subscription-tab";
import { OrganizationSupportTab } from "@/components/admin/organization-detail/organization-support-tab";
import { OrganizationUsageTab } from "@/components/admin/organization-detail/organization-usage-tab";
import type { OrganizationDetailTabId } from "@/components/admin/organization-detail/tabs";
import { useOrganizationDetailTab } from "@/components/admin/organization-detail/use-organization-detail-tab";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import type { AdminOrgSupportTicketSummary } from "@/lib/support/queries";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

export function OrganizationDetailWorkspace({
  org,
  supportTickets,
  initialTab,
  billingEnabled = false,
}: {
  org: AdminOrganizationDetail;
  supportTickets: AdminOrgSupportTicketSummary[];
  initialTab?: OrganizationDetailTabId;
  billingEnabled?: boolean;
}) {
  const { tab, setTab } = useOrganizationDetailTab(initialTab);

  return (
    <div className="admin-org-detail admin-page-workspace admin-organization-detail-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <OrganizationDetailHeader
            org={org}
            tab={tab}
            onTabChange={setTab}
            billingEnabled={billingEnabled}
          />
        </div>

        <OrganizationDetailKpiStrip org={org} tab={tab} onTabChange={setTab} />

        <div className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 md:px-6 lg:px-8">
          <AdminDetailTabPanel tabId="profile" activeTab={tab}>
            <OrganizationProfileTab org={org} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="subscription" activeTab={tab}>
            <OrganizationSubscriptionTab org={org} billingEnabled={billingEnabled} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="members" activeTab={tab}>
            <OrganizationMembersTab org={org} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="usage" activeTab={tab}>
            <OrganizationUsageTab org={org} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="billing" activeTab={tab}>
            <OrganizationBillingTab org={org} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="support" activeTab={tab}>
            <OrganizationSupportTab org={org} supportTickets={supportTickets} />
          </AdminDetailTabPanel>
        </div>
      </div>
    </div>
  );
}
