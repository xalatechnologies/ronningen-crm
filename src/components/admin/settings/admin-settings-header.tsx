"use client";

import { useTranslation } from "@/i18n/client";
import type { Translator } from "@/i18n/types";
import { AdminActionButton, AdminLinkButton } from "@/components/admin/admin-action-button";
import { AdminDetailHeaderMeta } from "@/components/admin/admin-detail-header-meta";
import { AdminDetailTabBar } from "@/components/admin/admin-detail-tab-bar";
import { AdminHealthStatusBadge } from "@/components/admin/admin-health-status-badge";
import {
  adminSettingsTabs,
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

function buildMetaItems(settings: AdminSettingsOverview, t: Translator): string[] {
  const { summary, platformAdmins } = settings;
  const items = [
    `${summary.configuredCount} av ${summary.totalCount} integrasjoner klare`,
    `${platformAdmins.length} plattformadministrator${platformAdmins.length === 1 ? "" : "er"}`,
  ];

  if (summary.missingRequiredCount > 0) {
    items.push(
      t("admin.overview_missing_env_many", {
        count: summary.missingRequiredCount,
      }),
    );
  }

  return items;
}

export function AdminSettingsHeader({
  settings,
  tab,
  onTabChange,
}: AdminSettingsHeaderProps) {
  const { t } = useTranslation();
  const { summary } = settings;

  return (
    <AppPageHeader
      className="mb-0"
      surface="default"
      compact
      detailLayout
      title={t("admin.plattforminnstillinger")}
      description={
        <AdminDetailHeaderMeta
          items={buildMetaItems(settings, t)}
          badges={<AdminHealthStatusBadge status={summary.overallStatus} />}
        />
      }
      actions={
        <>
          <AdminLinkButton href={adminRoutes.systemHealth}>{t("admin.systemhelse")}</AdminLinkButton>
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
          tabs={adminSettingsTabs(t)}
          activeTab={tab}
          onTabChange={onTabChange}
          aria-label={t("admin.plattforminnstillinger")}
        />
      }
      toolbarClassName="border-0 px-0 py-2.5 sm:py-3"
    />
  );
}
