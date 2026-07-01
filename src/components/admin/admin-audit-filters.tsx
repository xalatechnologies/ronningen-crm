"use client";

import { useTranslation } from "@/i18n/client";
import {
  getAdminAuditCategoryOptions,
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
  const { t } = useTranslation();
  const categoryOptions = getAdminAuditCategoryOptions(t);
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
        placeholder={t("admin.sok_admin_handling_mal_id")}
        aria-label={t("admin.sok_revisjonslogg")}
      />

      <AdminSegmentFilterDivider />

      <AdminSegmentFilterControls aria-label={t("admin.filtrer_revisjonslogg_etter_kategori")}>
        {categoryOptions.map((option) => {
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
