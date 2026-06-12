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
    <div className="admin-page-workspace flex min-w-0 flex-col">
      <UserDetailHeader
        user={user}
        tab={tab}
        onTabChange={setTab}
        isSelf={isSelf}
      />

      <UserDetailKpiStrip user={user} />

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
  );
}
