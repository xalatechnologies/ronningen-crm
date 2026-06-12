"use client";

import {
  ADMIN_AUDIT_CATEGORY_OPTIONS,
  type AdminAuditCategory,
} from "@/lib/admin/audit-categories";
import {
  AdminSegmentFilterBar,
  AdminSegmentFilterControls,
  AdminSegmentFilterDivider,
  AdminSegmentFilterSearch,
  adminSegmentFilterButtonClass,
} from "@/components/admin/admin-segment-filter-bar";

export type { AdminAuditCategory };

type AdminAuditFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  category: AdminAuditCategory;
  onCategoryChange: (value: AdminAuditCategory) => void;
  counts: Record<AdminAuditCategory, number>;
  embedded?: boolean;
};

export function AdminAuditFilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  counts,
  embedded = false,
}: AdminAuditFilterBarProps) {
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
        placeholder="Søk admin, handling, mål-ID…"
        aria-label="Søk revisjonslogg"
      />

      <AdminSegmentFilterDivider />

      <AdminSegmentFilterControls aria-label="Filtrer revisjonslogg etter kategori">
        {ADMIN_AUDIT_CATEGORY_OPTIONS.map((option) => {
          const count = counts[option.value];
          const active = category === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onCategoryChange(option.value)}
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
