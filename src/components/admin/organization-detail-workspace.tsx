"use client";

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
    <div className="admin-page-workspace flex min-w-0 flex-col">
      <OrganizationDetailHeader
        org={org}
        tab={tab}
        onTabChange={setTab}
        billingEnabled={billingEnabled}
      />

      <OrganizationDetailKpiStrip org={org} />

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
  );
}
