"use client";

import {
  ORGANIZATION_DETAIL_TABS,
  type OrganizationDetailTabId,
} from "@/components/admin/organization-detail/tabs";
import { cn } from "@/lib/utils";

export function OrganizationDetailTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: OrganizationDetailTabId;
  onTabChange: (tab: OrganizationDetailTabId) => void;
}) {
  return (
    <div
      className="org-detail-tab-bar"
      role="tablist"
      aria-label="Organisasjonsdetaljer"
    >
      {ORGANIZATION_DETAIL_TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active ? "true" : "false"}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn("org-detail-tab", active && "org-detail-tab--active")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
