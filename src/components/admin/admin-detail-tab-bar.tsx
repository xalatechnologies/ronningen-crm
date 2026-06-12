"use client";

import { adminSegmentFilterButtonClass } from "@/components/admin/admin-segment-filter-bar";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type AdminDetailTab<T extends string> = {
  id: T;
  label: string;
};

type AdminDetailTabBarProps<T extends string> = {
  tabs: readonly AdminDetailTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
  "aria-label"?: string;
};

export function AdminDetailTabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
  "aria-label": ariaLabel = "Detaljfane",
}: AdminDetailTabBarProps<T>) {
  return (
    <div
      className={cn("flex min-w-0 flex-wrap gap-1.5", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
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
            className={adminSegmentFilterButtonClass(active, "default")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminDetailTabPanel({
  tabId,
  activeTab,
  children,
  className,
}: {
  tabId: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}) {
  if (activeTab !== tabId) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className={className}
    >
      {children}
    </div>
  );
}
