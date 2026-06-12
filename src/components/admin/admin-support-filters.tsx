"use client";

import type { AdminSupportFilter } from "@/lib/admin/dashboard-links";
import type { AdminSupportTicket } from "@/lib/admin/queries/support";
import {
  AdminSegmentFilterBar,
  AdminSegmentFilterControls,
  AdminSegmentFilterDivider,
  AdminSegmentFilterSearch,
  adminSegmentFilterButtonClass,
} from "@/components/admin/admin-segment-filter-bar";

export type { AdminSupportFilter };

export const ADMIN_SUPPORT_FILTER_OPTIONS: {
  value: AdminSupportFilter;
  label: string;
}[] = [
  { value: "all", label: "Alle" },
  { value: "open", label: "Åpne" },
  { value: "waiting", label: "Venter" },
  { value: "resolved", label: "Løst" },
];

export function computeAdminSupportFilterCounts(
  tickets: AdminSupportTicket[],
): Record<AdminSupportFilter, number> {
  const counts: Record<AdminSupportFilter, number> = {
    all: tickets.length,
    open: 0,
    waiting: 0,
    resolved: 0,
  };

  for (const ticket of tickets) {
    if (ticket.status in counts) {
      counts[ticket.status as Exclude<AdminSupportFilter, "all">] += 1;
    }
  }

  return counts;
}

export type AdminSupportOverviewStats = {
  total: number;
  open: number;
  waiting: number;
  resolved: number;
};

export function computeAdminSupportOverviewStats(
  tickets: AdminSupportTicket[],
): AdminSupportOverviewStats {
  const counts = computeAdminSupportFilterCounts(tickets);
  return {
    total: counts.all,
    open: counts.open,
    waiting: counts.waiting,
    resolved: counts.resolved,
  };
}

export function matchesAdminSupportFilter(
  ticket: AdminSupportTicket,
  filter: AdminSupportFilter,
  search: string,
): boolean {
  const query = search.trim().toLowerCase();
  if (query) {
    const haystack = [
      ticket.organizationName,
      ticket.organizationSlug,
      ticket.subject,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (filter === "all") return true;
  return ticket.status === filter;
}

type AdminSupportFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: AdminSupportFilter;
  onFilterChange: (value: AdminSupportFilter) => void;
  counts: Record<AdminSupportFilter, number>;
  embedded?: boolean;
};

export function AdminSupportFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  counts,
  embedded = false,
}: AdminSupportFilterBarProps) {
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
        placeholder="Søk organisasjon, slug eller emne…"
        aria-label="Søk support-saker"
      />

      <AdminSegmentFilterDivider />

      <AdminSegmentFilterControls aria-label="Filtrer support-saker">
        {ADMIN_SUPPORT_FILTER_OPTIONS.map((option) => {
          const count = counts[option.value];
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilterChange(option.value)}
              className={adminSegmentFilterButtonClass(active)}
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
