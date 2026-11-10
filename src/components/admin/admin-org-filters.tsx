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

export type AdminOrgFilterStatus =
  | "all"
  | "active"
  | "incomplete"
  | "suspended"
  | "past_due"
  | "canceled"
  | "enterprise";

export type AdminOrgOverviewStats = {
  total: number;
  active: number;
  needsFollowUp: number;
  totalRevenue: number;
  totalVenues: number;
};

function getOrgFilterOptions(t: Translator) {
  return [
    { value: "all" as const, label: t("admin.alle") },
    { value: "active" as const, label: t("admin.aktive") },
    { value: "incomplete" as const, label: t("admin.ufullstendig") },
    { value: "suspended" as const, label: t("admin.suspendert") },
    { value: "past_due" as const, label: t("admin.forfalt") },
    { value: "canceled" as const, label: t("admin.avsluttet") },
    { value: "enterprise" as const, label: t("admin.enterprise") },
  ];
}

type AdminOrgFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: AdminOrgFilterStatus;
  onStatusChange: (value: AdminOrgFilterStatus) => void;
  counts: Record<AdminOrgFilterStatus, number>;
  embedded?: boolean;
};

export function AdminOrgFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  counts,
  embedded = false,
}: AdminOrgFiltersProps) {
  const { t } = useTranslation();
  const filterOptions = getOrgFilterOptions(t);
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
        placeholder={t("admin.sok_navn_slug_e_post_org_nr")}
        aria-label={t("admin.sok_organisasjoner")}
      />

      <AdminSegmentFilterDivider />

      <AdminSegmentFilterControls
        aria-label={t("admin.filtrer_organisasjoner")}
        className="min-w-0 overflow-x-auto pb-0.5"
      >
        {filterOptions.map((option) => {
          const count = counts[option.value];
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
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

export function computeAdminOrgOverviewStats(
  organizations: {
    subscriptionStatus: string;
    isSuspended: boolean;
    totalRevenue: number;
    venueCount: number;
  }[],
): AdminOrgOverviewStats {
  let active = 0;
  let needsFollowUp = 0;
  let totalRevenue = 0;
  let totalVenues = 0;

  for (const org of organizations) {
    totalRevenue += org.totalRevenue;
    totalVenues += org.venueCount;

    if (
      !org.isSuspended &&
      ["active", "trialing"].includes(org.subscriptionStatus)
    ) {
      active += 1;
    }

    if (
      org.isSuspended ||
      org.subscriptionStatus === "incomplete" ||
      org.subscriptionStatus === "past_due"
    ) {
      needsFollowUp += 1;
    }
  }

  return {
    total: organizations.length,
    active,
    needsFollowUp,
    totalRevenue,
    totalVenues,
  };
}

export function computeAdminOrgFilterCounts(
  organizations: {
    subscriptionStatus: string;
    subscriptionPlan: string;
    isSuspended: boolean;
  }[],
): Record<AdminOrgFilterStatus, number> {
  const counts: Record<AdminOrgFilterStatus, number> = {
    all: organizations.length,
    active: 0,
    incomplete: 0,
    suspended: 0,
    past_due: 0,
    canceled: 0,
    enterprise: 0,
  };

  for (const org of organizations) {
    if (org.subscriptionPlan === "enterprise") counts.enterprise += 1;
    if (org.isSuspended) {
      counts.suspended += 1;
      continue;
    }
    if (org.subscriptionStatus === "incomplete") {
      counts.incomplete += 1;
    } else if (["active", "trialing"].includes(org.subscriptionStatus)) {
      counts.active += 1;
    } else if (org.subscriptionStatus === "past_due") {
      counts.past_due += 1;
    } else if (org.subscriptionStatus === "canceled") {
      counts.canceled += 1;
    }
  }

  return counts;
}

export function matchesAdminOrgFilter(
  org: {
    name: string;
    slug: string;
    subscriptionStatus: string;
    subscriptionPlan: string;
    isSuspended: boolean;
    billingEmail?: string | null;
    contactEmail?: string | null;
    orgNumber?: string | null;
  },
  search: string,
  status: AdminOrgFilterStatus,
): boolean {
  const query = search.trim().toLowerCase();
  if (query) {
    const haystack = [
      org.name,
      org.slug,
      org.billingEmail,
      org.contactEmail,
      org.orgNumber,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  switch (status) {
    case "all":
      return true;
    case "suspended":
      return org.isSuspended;
    case "active":
      return !org.isSuspended && ["active", "trialing"].includes(org.subscriptionStatus);
    case "incomplete":
      return !org.isSuspended && org.subscriptionStatus === "incomplete";
    case "past_due":
      return !org.isSuspended && org.subscriptionStatus === "past_due";
    case "canceled":
      return !org.isSuspended && org.subscriptionStatus === "canceled";
    case "enterprise":
      return org.subscriptionPlan === "enterprise";
    default:
      return true;
  }
}
