"use client";

import { AdminDetailTabPanel } from "@/components/admin/admin-detail-tab-bar";
import { UserAccountTab } from "@/components/admin/user-detail/user-account-tab";
import { UserAuditTab } from "@/components/admin/user-detail/user-audit-tab";
import { UserDetailHeader } from "@/components/admin/user-detail/user-detail-header";
import { UserDetailKpiStrip } from "@/components/admin/user-detail/user-detail-kpi-strip";
import { UserOrganizationsTab } from "@/components/admin/user-detail/user-organizations-tab";
import type { UserDetailTabId } from "@/components/admin/user-detail/tabs";
import { useUserDetailTab } from "@/components/admin/user-detail/use-user-detail-tab";
import type { AdminUserDetail } from "@/lib/admin/queries/users-billing-audit";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type AdminUserDetailWorkspaceProps = {
  user: AdminUserDetail;
  currentAdminUserId: string;
  initialTab?: UserDetailTabId;
};

export function AdminUserDetailWorkspace({
  user,
  currentAdminUserId,
  initialTab,
}: AdminUserDetailWorkspaceProps) {
  const { tab, setTab } = useUserDetailTab(initialTab);
  const isSelf = user.id === currentAdminUserId;

  return (
    <div className="admin-page-workspace admin-user-detail-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <UserDetailHeader
            user={user}
            tab={tab}
            onTabChange={setTab}
            isSelf={isSelf}
          />
        </div>

        <UserDetailKpiStrip user={user} tab={tab} onTabChange={setTab} />

        <div className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 md:px-6 lg:px-8">
          <AdminDetailTabPanel tabId="account" activeTab={tab}>
            <UserAccountTab user={user} isSelf={isSelf} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="organizations" activeTab={tab}>
            <UserOrganizationsTab user={user} />
          </AdminDetailTabPanel>

          <AdminDetailTabPanel tabId="audit" activeTab={tab}>
            <UserAuditTab user={user} />
          </AdminDetailTabPanel>
        </div>
      </div>
    </div>
  );
}
