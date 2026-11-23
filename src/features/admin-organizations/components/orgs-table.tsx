"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminAccessBadge } from "@/components/admin/admin-access-badge";
import { AdminPlanBadge } from "@/components/admin/admin-badges";
import { AdminHealthBadge } from "@/components/admin/admin-health-badge";
import { AdminTableDetailLink } from "@/components/admin/admin-table-detail-link";
import { adminRoutes } from "@/config/admin-routes";
import { relativeDays, trialState, type OrgSortKey, type SortDirection } from "@/features/admin-organizations/lib/org-list";
import { useTranslation } from "@/i18n/client";
import type { AdminOrganizationRow } from "@/lib/admin/queries/organizations";
import { formatNok } from "@/lib/admin/revenue-metrics";
import { cn } from "@/lib/utils";

type Props = {
  rows: AdminOrganizationRow[];
  selected: ReadonlySet<string>;
  allSelected: boolean;
  sortKey: OrgSortKey;
  sortDirection: SortDirection;
  now: Date;
  billingEnabled: boolean;
  onSort: (key: OrgSortKey) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string, checked: boolean) => void;
};

const TH = "px-4 py-3 text-left text-app-xs font-semibold text-muted-foreground md:px-5";
const TD = "px-4 py-4 align-middle md:px-5";

function SortHeader({ label, column, active, direction, align, onSort }: { label: string; column: OrgSortKey; active: boolean; direction: SortDirection; align?: "right"; onSort: (key: OrgSortKey) => void }) {
  const { t } = useTranslation();
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"} className={cn(TH, align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={t("admin.orgs_sort_by", { column: label })}
        className={cn("inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50", active && "text-foreground")}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
      </button>
    </th>
  );
}

/** The organizations as a table with sortable columns, a checkbox per row, and the row opening the organization. */
export function OrgsTable({ rows, selected, allSelected, sortKey, sortDirection, now, billingEnabled, onSort, onToggleAll, onToggleOne }: Props) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const head = (key: OrgSortKey, label: string, align?: "right") => (
    <SortHeader label={label} column={key} active={sortKey === key} direction={sortDirection} align={align} onSort={onSort} />
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[60rem] text-left text-app-base">
        <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
          <tr className="border-b border-foreground/15">
            <th scope="col" className={cn(TH, "w-12")}>
              <input type="checkbox" checked={allSelected} onChange={(e) => onToggleAll(e.target.checked)} aria-label={t("admin.velg_alle")} className="size-4 rounded accent-success" />
            </th>
            {head("name", t("adminLabels.fields.name"))}
            <th scope="col" className={TH}>{t("admin.tilgang")}</th>
            <th scope="col" className={TH}>{t("admin.helse")}</th>
            <th scope="col" className={TH}>{t("admin.plan")}</th>
            {head("trialEnds", t("adminLabels.fields.trialEnds"))}
            {head("venueCount", t("admin.lokaler"), "right")}
            {head("totalRevenue", t("admin.inntekt"), "right")}
            {head("lastActivityAt", t("adminLabels.fields.lastActivity"))}
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {rows.map((org) => {
            const trial = trialState(org.trialEnds, now);
            const trialWhen = relativeDays(org.trialEnds, now, locale);
            const lastSeen = relativeDays(org.lastActivityAt, now, locale);
            const isSelected = selected.has(org.id);
            return (
              <tr
                key={org.id}
                data-selected={isSelected || undefined}
                className={cn("cursor-pointer transition-colors hover:bg-muted/40", isSelected && "bg-muted/50")}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a, button, input, label")) return;
                  router.push(adminRoutes.organizationDetail(org.id));
                }}
              >
                <td className={TD}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggleOne(org.id, e.target.checked)}
                    aria-label={t("adminLabels.selectOrganizationAria", { name: org.name })}
                    className="size-4 rounded accent-success"
                  />
                </td>
                <td className="p-0 align-middle">
                  <AdminTableDetailLink href={adminRoutes.organizationDetail(org.id)} title={org.name} subtitle={org.slug} className="px-4 md:px-5" />
                </td>
                <td className={TD}>
                  <AdminAccessBadge isSuspended={org.isSuspended} subscriptionStatus={org.subscriptionStatus} providerSubscriptionId={org.providerSubscriptionId} billingEnabled={billingEnabled} />
                </td>
                <td className={TD}>
                  <AdminHealthBadge health={org.health} />
                </td>
                <td className={TD}>
                  <AdminPlanBadge plan={org.subscriptionPlan} />
                </td>
                <td className={TD}>
                  {org.trialEnds && trial.kind !== "none" ? (
                    <>
                      <time dateTime={org.trialEnds} className="block text-app-sm text-foreground">
                        {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Oslo" }).format(new Date(org.trialEnds))}
                      </time>
                      <span className={cn("text-app-xs", trial.kind === "expired" ? "font-semibold text-status-danger-text" : trial.kind === "soon" ? "font-semibold text-status-warning-text" : "text-muted-foreground")}>
                        {trial.kind === "expired" ? t("admin.orgs_trial_expired", { when: trialWhen ?? "" }) : trialWhen}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className={cn(TD, "text-right tabular-nums")}>{org.venueCount}</td>
                <td className={cn(TD, "text-right font-semibold tabular-nums text-foreground")}>{formatNok(org.totalRevenue)}</td>
                <td className={cn(TD, "text-app-sm text-muted-foreground")}>
                  {org.lastActivityAt ? (
                    <time dateTime={org.lastActivityAt} title={new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Oslo" }).format(new Date(org.lastActivityAt))}>
                      {lastSeen}
                    </time>
                  ) : (
                    t("admin.orgs_no_activity")
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
