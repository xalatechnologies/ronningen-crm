"use client";

import {
  CUSTOMERS_PAGE_TABS,
  type CustomersPageTabId,
} from "@/components/customers/tabs";
import { useTranslation } from "@/i18n/client";
import { RN_SEGMENT_CONTROL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

const TAB_LABEL_KEYS: Record<CustomersPageTabId, "customers.title" | "customers.partners"> = {
  customers: "customers.title",
  partners: "customers.partners",
};

export function CustomersPageTabBar({
  activeTab,
  onTabChange,
  customerCount,
  partnerCount,
}: {
  activeTab: CustomersPageTabId;
  onTabChange: (tab: CustomersPageTabId) => void;
  customerCount?: number;
  partnerCount?: number;
}) {
  const { t } = useTranslation();
  const counts: Record<CustomersPageTabId, number | undefined> = {
    customers: customerCount,
    partners: partnerCount,
  };

  return (
    <div
      className={cn(RN_SEGMENT_CONTROL, "inline-flex shrink-0 gap-1.5 p-1.5")}
      role="tablist"
      aria-label={t("customers.tabsAria")}
    >
      {CUSTOMERS_PAGE_TABS.map((tab) => {
        const active = activeTab === tab.id;
        const count = counts[tab.id];
        const baseLabel = t(TAB_LABEL_KEYS[tab.id]);
        const label = count != null ? `${baseLabel} (${count})` : baseLabel;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active ? "true" : "false"}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-md border-2 border-transparent px-5 py-2.5 text-app-sm font-semibold transition-all outline-none select-none md:min-h-12 md:px-6 md:text-app-base",
              "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2",
              active
                ? "border-rn-accent-border bg-success !text-white shadow-md"
                : "text-rn-text-body hover:border-rn-badge-border hover:bg-card",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
