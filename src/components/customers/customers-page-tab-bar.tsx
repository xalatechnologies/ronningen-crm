"use client";

import {
  CUSTOMERS_PAGE_TABS,
  type CustomersPageTabId,
} from "@/components/customers/tabs";
import { useTranslation } from "@/i18n/client";
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
      className="inline-flex shrink-0 gap-1 rounded-xl bg-muted p-1"
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
              "inline-flex h-10 items-center justify-center rounded-lg px-4 text-app-sm font-semibold transition-colors outline-none select-none md:px-5",
              "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2",
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
