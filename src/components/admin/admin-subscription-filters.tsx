"use client";

import { useTranslation } from "@/i18n/client";
import type { AdminBillingRow } from "@/lib/admin/queries/users-billing-audit";
import {
  AdminSegmentFilterBar,
  AdminSegmentFilterControls,
  AdminSegmentFilterDivider,
  AdminSegmentFilterSearch,
  adminSegmentFilterButtonClass,
} from "@/components/admin/admin-segment-filter-bar";
import type { Translator } from "@/i18n/types";

export type AdminSubscriptionFilter =
  | "all"
  | "active"
  | "trialing"
  | "incomplete"
  | "past_due"
  | "canceled"
  | "suspended";

export function getAdminSubscriptionFilterOptions(t: Translator) {
  return [
    { value: "all" as const, label: t("admin.alle") },
    { value: "active" as const, label: t("admin.aktiv") },
    { value: "trialing" as const, label: t("admin.prove") },
    { value: "incomplete" as const, label: t("admin.ufullstendig") },
    { value: "past_due" as const, label: t("admin.forfalt") },
    { value: "canceled" as const, label: t("admin.avsluttet") },
    { value: "suspended" as const, label: t("admin.suspendert") },
  ];
}

type AdminSubscriptionFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: AdminSubscriptionFilter;
  onFilterChange: (value: AdminSubscriptionFilter) => void;
  counts: Record<AdminSubscriptionFilter, number>;
  embedded?: boolean;
};

export type AdminSubscriptionOverviewStats = {
  total: number;
  active: number;
  trialing: number;
  stripeConnected: number;
  mrrNok: number;
};

export function AdminSubscriptionFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  counts,
  embedded = false,
}: AdminSubscriptionFilterBarProps) {
  const { t } = useTranslation();
  const filterOptions = getAdminSubscriptionFilterOptions(t);
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
        placeholder={t("admin.sok_navn_slug_e_post_stripe_id")}
        aria-label={t("admin.sok_abonnement")}
      />

      <AdminSegmentFilterDivider />

      <AdminSegmentFilterControls
        aria-label={t("admin.filtrer_abonnement")}
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

export function computeAdminSubscriptionOverviewStats(
  rows: Pick<
    AdminBillingRow,
    "subscriptionStatus" | "isSuspended" | "providerSubscriptionId"
  >[],
  monthlyPriceNok: number,
): AdminSubscriptionOverviewStats {
  let active = 0;
  let trialing = 0;
  let stripeConnected = 0;

  for (const row of rows) {
    if (row.providerSubscriptionId) stripeConnected += 1;
    if (row.isSuspended) continue;
    if (row.subscriptionStatus === "active") active += 1;
    if (row.subscriptionStatus === "trialing") trialing += 1;
  }

  return {
    total: rows.length,
    active,
    trialing,
    stripeConnected,
    mrrNok: active * monthlyPriceNok,
  };
}

export function computeAdminSubscriptionFilterCounts(
  rows: Pick<AdminBillingRow, "subscriptionStatus" | "isSuspended">[],
): Record<AdminSubscriptionFilter, number> {
  const counts: Record<AdminSubscriptionFilter, number> = {
    all: rows.length,
    active: 0,
    trialing: 0,
    incomplete: 0,
    past_due: 0,
    canceled: 0,
    suspended: 0,
  };

  for (const row of rows) {
    if (row.isSuspended) {
      counts.suspended += 1;
      continue;
    }
    if (row.subscriptionStatus in counts) {
      counts[row.subscriptionStatus as Exclude<
        AdminSubscriptionFilter,
        "all" | "suspended"
      >] += 1;
    }
  }

  return counts;
}

export function matchesAdminSubscriptionFilter(
  row: Pick<
    AdminBillingRow,
    | "name"
    | "slug"
    | "billingEmail"
    | "subscriptionStatus"
    | "isSuspended"
    | "providerCustomerId"
    | "providerSubscriptionId"
  >,
  search: string,
  filter: AdminSubscriptionFilter,
): boolean {
  const query = search.trim().toLowerCase();
  if (query) {
    const haystack = [
      row.name,
      row.slug,
      row.billingEmail,
      row.providerCustomerId,
      row.providerSubscriptionId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  switch (filter) {
    case "all":
      return true;
    case "suspended":
      return row.isSuspended;
    default:
      return !row.isSuspended && row.subscriptionStatus === filter;
  }
}
