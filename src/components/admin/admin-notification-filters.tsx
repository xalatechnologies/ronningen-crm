"use client";

import { useTranslation } from "@/i18n/client";
import { FormSelect } from "@/components/ui/form-select";
import {
  adminCampaignFilterOptions,
  adminDeliveryFilterOptions,
  adminNotificationViewOptions,
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
  const { t } = useTranslation();
  const viewOptions = adminNotificationViewOptions(t);
  const campaignOptions = adminCampaignFilterOptions(t);
  const deliveryOptions = adminDeliveryFilterOptions(t);

  const subFilterOptions =
    view === "campaigns" && campaignCounts
      ? campaignOptions.map((option) => ({
          value: option.value,
          label: `${option.label} (${campaignCounts[option.value]})`,
        }))
      : view === "deliveries" && deliveryCounts
        ? deliveryOptions.map((option) => ({
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
        placeholder={t("admin.sok_maler_kampanjer_leveringer")}
        aria-label={t("admin.sok_varsler")}
      />

      <AdminSegmentFilterDivider />

      <AdminSegmentFilterControls>
        <div
          className="flex min-w-0 flex-wrap gap-1.5"
          role="group"
          aria-label={t("admin.vis_varsler_etter_type")}
        >
          {viewOptions.map((option) => {
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
              aria-label={t("admin.filtrer_kampanjer_etter_status")}
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
              aria-label={t("admin.filtrer_leveringer_etter_status")}
              className="min-h-11"
            />
          </div>
        ) : null}

        {createAction ? <div className="shrink-0">{createAction}</div> : null}
      </AdminSegmentFilterControls>
    </AdminSegmentFilterBar>
  );
}
