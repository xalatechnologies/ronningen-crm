"use client";

import { FormSelect } from "@/components/ui/form-select";
import {
  ADMIN_CAMPAIGN_FILTER_OPTIONS,
  ADMIN_DELIVERY_FILTER_OPTIONS,
  ADMIN_NOTIFICATION_VIEW_OPTIONS,
  type AdminCampaignFilter,
  type AdminDeliveryFilter,
  type AdminNotificationView,
} from "@/lib/admin/notification-filters";
import {
  AdminSegmentFilterBar,
  AdminSegmentFilterControls,
  AdminSegmentFilterDivider,
  AdminSegmentFilterSearch,
  adminSegmentFilterButtonClass,
} from "@/components/admin/admin-segment-filter-bar";
import type { ReactNode } from "react";

export type { AdminNotificationView, AdminCampaignFilter, AdminDeliveryFilter };

type AdminNotificationFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  view: AdminNotificationView;
  onViewChange: (value: AdminNotificationView) => void;
  viewCounts: Record<AdminNotificationView, number>;
  campaignFilter?: AdminCampaignFilter;
  onCampaignFilterChange?: (value: AdminCampaignFilter) => void;
  campaignCounts?: Record<AdminCampaignFilter, number>;
  deliveryFilter?: AdminDeliveryFilter;
  onDeliveryFilterChange?: (value: AdminDeliveryFilter) => void;
  deliveryCounts?: Record<AdminDeliveryFilter, number>;
  createAction?: ReactNode;
  embedded?: boolean;
};

export function AdminNotificationFilterBar({
  search,
  onSearchChange,
  view,
  onViewChange,
  viewCounts,
  campaignFilter = "all",
  onCampaignFilterChange,
  campaignCounts,
  deliveryFilter = "all",
  onDeliveryFilterChange,
  deliveryCounts,
  createAction,
  embedded = false,
}: AdminNotificationFilterBarProps) {
  const subFilterOptions =
    view === "campaigns" && campaignCounts
      ? ADMIN_CAMPAIGN_FILTER_OPTIONS.map((option) => ({
          value: option.value,
          label: `${option.label} (${campaignCounts[option.value]})`,
        }))
      : view === "deliveries" && deliveryCounts
        ? ADMIN_DELIVERY_FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: `${option.label} (${deliveryCounts[option.value]})`,
          }))
        : null;

  const subFilterValue =
    view === "campaigns" ? campaignFilter : view === "deliveries" ? deliveryFilter : "";

  return (
    <AdminSegmentFilterBar
      className={
        embedded
          ? "border-0 bg-transparent p-0 shadow-none ring-0"
          : undefined
      }
    >
      <AdminSegmentFilterSearch
        value={search}
        onChange={onSearchChange}
        placeholder="Søk maler, kampanjer, leveringer…"
        aria-label="Søk varsler"
      />

      <AdminSegmentFilterDivider />

      <AdminSegmentFilterControls>
        <div
          className="flex min-w-0 flex-wrap gap-1.5"
          role="group"
          aria-label="Vis varsler etter type"
        >
          {ADMIN_NOTIFICATION_VIEW_OPTIONS.map((option) => {
            const count = viewCounts[option.value];
            const active = view === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onViewChange(option.value)}
                className={adminSegmentFilterButtonClass(active)}
                aria-pressed={active ? "true" : "false"}
              >
                {option.label}
                <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {subFilterOptions && onCampaignFilterChange && view === "campaigns" ? (
          <div className="w-full shrink-0 sm:w-36">
            <FormSelect
              value={subFilterValue}
              onValueChange={(value) =>
                onCampaignFilterChange(value as AdminCampaignFilter)
              }
              options={subFilterOptions}
              aria-label="Filtrer kampanjer etter status"
              className="min-h-11"
            />
          </div>
        ) : null}

        {subFilterOptions && onDeliveryFilterChange && view === "deliveries" ? (
          <div className="w-full shrink-0 sm:w-36">
            <FormSelect
              value={subFilterValue}
              onValueChange={(value) =>
                onDeliveryFilterChange(value as AdminDeliveryFilter)
              }
              options={subFilterOptions}
              aria-label="Filtrer leveringer etter status"
              className="min-h-11"
            />
          </div>
        ) : null}

        {createAction ? <div className="shrink-0">{createAction}</div> : null}
      </AdminSegmentFilterControls>
    </AdminSegmentFilterBar>
  );
}
