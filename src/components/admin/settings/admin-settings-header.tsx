"use client";

import { AdminActionButton, AdminLinkButton } from "@/components/admin/admin-action-button";
import { AdminDetailHeaderMeta } from "@/components/admin/admin-detail-header-meta";
import { AdminDetailTabBar } from "@/components/admin/admin-detail-tab-bar";
import { AdminHealthStatusBadge } from "@/components/admin/admin-health-status-badge";
import {
  ADMIN_SETTINGS_TABS,
  type AdminSettingsTabId,
} from "@/components/admin/settings/admin-settings-tabs";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { adminRoutes } from "@/config/admin-routes";
import type { AdminSettingsOverview } from "@/lib/admin/queries/settings";

type AdminSettingsHeaderProps = {
  settings: AdminSettingsOverview;
  tab: AdminSettingsTabId;
  onTabChange: (tab: AdminSettingsTabId) => void;
};

function buildMetaItems(settings: AdminSettingsOverview): string[] {
  const { summary, platformAdmins } = settings;
  const items = [
    `${summary.configuredCount} av ${summary.totalCount} integrasjoner klare`,
    `${platformAdmins.length} plattformadministrator${platformAdmins.length === 1 ? "" : "er"}`,
  ];

  if (summary.missingRequiredCount > 0) {
    items.push(
      `${summary.missingRequiredCount} påkrevde miljøvariabler mangler`,
    );
  }

  return items;
}

export function AdminSettingsHeader({
  settings,
  tab,
  onTabChange,
}: AdminSettingsHeaderProps) {
  const { summary } = settings;

  return (
    <AppPageHeader
      className="mb-0"
      surface="default"
      compact
      detailLayout
      title="Plattforminnstillinger"
      description={
        <AdminDetailHeaderMeta
          items={buildMetaItems(settings)}
          badges={<AdminHealthStatusBadge status={summary.overallStatus} />}
        />
      }
      actions={
        <>
          <AdminLinkButton href={adminRoutes.systemHealth}>
            Systemhelse
          </AdminLinkButton>
          {settings.stripeConfigured ? (
            <AdminActionButton
              className="hidden sm:inline-flex"
              nativeButton={false}
              render={
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Stripe
            </AdminActionButton>
          ) : null}
        </>
      }
      toolbar={
        <AdminDetailTabBar
          tabs={ADMIN_SETTINGS_TABS}
          activeTab={tab}
          onTabChange={onTabChange}
          aria-label="Plattforminnstillinger"
        />
      }
      toolbarClassName="border-0 px-0 py-2.5 sm:py-3"
    />
  );
}
