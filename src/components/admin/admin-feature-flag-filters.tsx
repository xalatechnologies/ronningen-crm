"use client";

import {
  ADMIN_FEATURE_FLAG_FILTER_OPTIONS,
  type AdminFeatureFlagFilter,
} from "@/lib/admin/feature-flag-status";
import {
  AdminSegmentFilterBar,
  AdminSegmentFilterControls,
  AdminSegmentFilterDivider,
  AdminSegmentFilterSearch,
  adminSegmentFilterButtonClass,
} from "@/components/admin/admin-segment-filter-bar";

export type { AdminFeatureFlagFilter };

type AdminFeatureFlagFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: AdminFeatureFlagFilter;
  onFilterChange: (value: AdminFeatureFlagFilter) => void;
  counts: Record<AdminFeatureFlagFilter, number>;
  embedded?: boolean;
};

export function AdminFeatureFlagFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  counts,
  embedded = false,
}: AdminFeatureFlagFilterBarProps) {
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
        placeholder="Søk nøkkel eller beskrivelse…"
        aria-label="Søk funksjonsflagg"
      />

      <AdminSegmentFilterDivider />

      <AdminSegmentFilterControls aria-label="Filtrer funksjonsflagg etter status">
        {ADMIN_FEATURE_FLAG_FILTER_OPTIONS.map((option) => {
          const count = counts[option.value];
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilterChange(option.value)}
              className={adminSegmentFilterButtonClass(active, "narrow")}
              aria-pressed={active ? "true" : "false"}
            >
              {option.label}
              <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
            </button>
          );
        })}
      </AdminSegmentFilterControls>
    </AdminSegmentFilterBar>
  );
}
