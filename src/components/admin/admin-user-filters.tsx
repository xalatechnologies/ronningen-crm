"use client";

import { useTranslation } from "@/i18n/client";
import {
  AdminSegmentFilterBar,
  AdminSegmentFilterControls,
  AdminSegmentFilterDivider,
  AdminSegmentFilterSearch,
  adminSegmentFilterButtonClass,
} from "@/components/admin/admin-segment-filter-bar";
import type { Translator } from "@/i18n/types";
import type { AdminUserRow } from "@/lib/admin/queries/users-billing-audit";

export type AdminUserFilter =
  | "all"
  | "platform_admin"
  | "no_org"
  | "inactive";

export function getAdminUserFilterOptions(t: Translator) {
  return [
    { value: "all" as const, label: t("admin.alle") },
    { value: "platform_admin" as const, label: t("admin.plattformadmin") },
    { value: "no_org" as const, label: t("admin.uten_org") },
    { value: "inactive" as const, label: t("admin.inaktive") },
  ];
}

export function isInactiveUser(user: AdminUserRow): boolean {
  if (user.isDisabled) return true;
  if (!user.lastSignInAt) return true;
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return new Date(user.lastSignInAt) < ninetyDaysAgo;
}

export function computeAdminUserFilterCounts(
  users: AdminUserRow[],
): Record<AdminUserFilter, number> {
  const counts: Record<AdminUserFilter, number> = {
    all: users.length,
    platform_admin: 0,
    no_org: 0,
    inactive: 0,
  };

  for (const user of users) {
    if (user.isPlatformAdmin) counts.platform_admin += 1;
    if (user.organizationCount === 0) counts.no_org += 1;
    if (isInactiveUser(user)) counts.inactive += 1;
  }

  return counts;
}

export function matchesAdminUserFilter(
  user: AdminUserRow,
  filter: AdminUserFilter,
  search: string,
): boolean {
  const query = search.trim().toLowerCase();
  if (query) {
    const haystack = [
      user.fullName,
      user.email,
      ...user.organizations.map((org) => org.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  switch (filter) {
    case "platform_admin":
      return user.isPlatformAdmin;
    case "no_org":
      return user.organizationCount === 0;
    case "inactive":
      return isInactiveUser(user);
    default:
      return true;
  }
}

type AdminUserFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: AdminUserFilter;
  onFilterChange: (value: AdminUserFilter) => void;
  counts: Record<AdminUserFilter, number>;
  embedded?: boolean;
};

export type AdminUserOverviewStats = {
  total: number;
  platformAdmins: number;
  withOrganization: number;
  inactive: number;
};

export function computeAdminUserOverviewStats(
  users: AdminUserRow[],
): AdminUserOverviewStats {
  let platformAdmins = 0;
  let withOrganization = 0;
  let inactive = 0;

  for (const user of users) {
    if (user.isPlatformAdmin) platformAdmins += 1;
    if (user.organizationCount > 0) withOrganization += 1;
    if (isInactiveUser(user)) inactive += 1;
  }

  return {
    total: users.length,
    platformAdmins,
    withOrganization,
    inactive,
  };
}

export function AdminUserFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  counts,
  embedded = false,
}: AdminUserFilterBarProps) {
  const { t } = useTranslation();
  const filterOptions = getAdminUserFilterOptions(t);
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
        placeholder={t("admin.sok_navn_e_post_organisasjon")}
        aria-label={t("admin.sok_brukere")}
      />

      <AdminSegmentFilterDivider />

      <AdminSegmentFilterControls
        aria-label={t("admin.filtrer_brukere")}
        className="min-w-0 overflow-x-auto pb-0.5"
      >
        {filterOptions.map((option) => {
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
