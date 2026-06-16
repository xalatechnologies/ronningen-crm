"use client";

import { AdminKpiTile } from "@/components/admin/admin-kpi-tile";
import { AdminPlanBadge, AdminStatusBadge } from "@/components/admin/admin-badges";
import {
  AdminSubscriptionFilterBar,
  computeAdminSubscriptionFilterCounts,
  computeAdminSubscriptionOverviewStats,
  matchesAdminSubscriptionFilter,
  type AdminSubscriptionFilter,
} from "@/components/admin/admin-subscription-filters";
import { AdminTableDetailLink } from "@/components/admin/admin-table-detail-link";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { FormSelect } from "@/components/ui/form-select";
import {
  ADMIN_SETTABLE_SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_PLANS,
  type AdminSettableSubscriptionStatus,
  type SubscriptionPlan,
} from "@/constants/roles";
import { adminRoutes } from "@/config/admin-routes";
import { updateOrganizationSubscription } from "@/lib/admin/actions/organization-subscription";
import {
  extendOrganizationTrial,
  getStripeDashboardUrl,
  retrySubscriptionPayment,
} from "@/lib/admin/actions/subscriptions";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/admin/subscription-labels";
import type { AdminBillingRow } from "@/lib/admin/queries/users-billing-audit";
import { formatNok } from "@/lib/admin/revenue-metrics";
import { SAAS_MONTHLY_PRICE_NOK } from "@/lib/billing/constants";
import { resolveTenantAccess } from "@/lib/subscriptions/subscription-utils";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Building2,
  Clock,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const ACCESS_LABELS: Record<string, string> = {
  full: "Full tilgang",
  warning: "Advarsel",
  billing_only: "Kun fakturering",
  suspended: "Suspendert",
};

const STATUS_OPTIONS = ADMIN_SETTABLE_SUBSCRIPTION_STATUSES.map((value) => ({
  value,
  label: SUBSCRIPTION_STATUS_LABELS[value] ?? value,
}));

const tableHeadClass =
  "px-6 py-4 text-left text-app-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 align-middle md:px-8 md:py-6";

function normalizePlan(plan: string): SubscriptionPlan {
  if (SUBSCRIPTION_PLANS.includes(plan as SubscriptionPlan)) {
    return plan as SubscriptionPlan;
  }
  return "standard";
}

function BillingStatusSelect({
  row,
  disabled,
  onUpdated,
}: {
  row: AdminBillingRow;
  disabled: boolean;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleChange(nextStatus: string) {
    if (!nextStatus || nextStatus === row.subscriptionStatus) return;

    setBusy(true);
    const result = await updateOrganizationSubscription({
      organizationId: row.id,
      subscriptionStatus: nextStatus as AdminSettableSubscriptionStatus,
      subscriptionPlan: normalizePlan(row.subscriptionPlan),
    });
    setBusy(false);

    if (!result.ok) {
      toast.error("Kunne ikke oppdatere abonnement", {
        description: result.error,
      });
      return;
    }

    toast.success("Abonnementsstatus oppdatert");
    onUpdated();
  }

  return (
    <FormSelect
      value={row.subscriptionStatus}
      onValueChange={(value) => void handleChange(value)}
      options={STATUS_OPTIONS}
      disabled={disabled || busy}
      className="admin-table-select min-w-[10.5rem]"
      aria-label={`Endre status for ${row.name}`}
    />
  );
}

function SubscriptionStripeCell({
  row,
  onUpdated,
}: {
  row: AdminBillingRow;
  onUpdated: () => void;
}) {
  if (!row.providerSubscriptionId) {
    return <span className="text-muted-foreground">Ikke koblet</span>;
  }

  return (
    <div>
      <span className="font-semibold text-success">Koblet</span>
      {row.providerCustomerId ? (
        <p
          className="admin-ops-id mt-1 max-w-[9rem] truncate font-mono text-app-xs text-muted-foreground"
          title={row.providerCustomerId}
        >
          {row.providerCustomerId}
        </p>
      ) : null}
      <div className="admin-ops-inline-actions">
        <button
          type="button"
          className="admin-ops-inline-link"
          onClick={() =>
            void (async () => {
              const result = await getStripeDashboardUrl(row.id);
              if (result.ok) window.open(result.url, "_blank");
              else toast.error(result.error);
            })()
          }
        >
          Åpne Stripe
        </button>
        <button
          type="button"
          className="admin-ops-inline-link"
          onClick={() =>
            void (async () => {
              const result = await retrySubscriptionPayment(row.id);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Betaling forsøkt");
                onUpdated();
              }
            })()
          }
        >
          Prøv betaling
        </button>
      </div>
    </div>
  );
}

export function AdminSubscriptionsWorkspace({
  rows,
  initialFilter = "all",
  initialSearch = "",
  billingEnabled = false,
}: {
  rows: AdminBillingRow[];
  initialFilter?: AdminSubscriptionFilter;
  initialSearch?: string;
  billingEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<AdminSubscriptionFilter>(initialFilter);
  const [search, setSearch] = useState(initialSearch);

  function updateUrl(next: { filter?: AdminSubscriptionFilter; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextFilter = next.filter ?? filter;
    const nextSearch = next.q ?? search;

    if (nextFilter === "all") params.delete("filter");
    else params.set("filter", nextFilter);

    if (!nextSearch.trim()) params.delete("q");
    else params.set("q", nextSearch.trim());

    const qs = params.toString();
    router.push(
      qs ? `${adminRoutes.subscriptions}?${qs}` : adminRoutes.subscriptions,
    );
  }

  function updateFilter(next: AdminSubscriptionFilter) {
    setFilter(next);
    updateUrl({ filter: next });
  }

  function updateSearch(nextSearch: string) {
    setSearch(nextSearch);
    updateUrl({ q: nextSearch });
  }

  const counts = useMemo(
    () => computeAdminSubscriptionFilterCounts(rows),
    [rows],
  );

  const overview = useMemo(
    () =>
      computeAdminSubscriptionOverviewStats(rows, SAAS_MONTHLY_PRICE_NOK),
    [rows],
  );

  const filtered = useMemo(
    () => rows.filter((row) => matchesAdminSubscriptionFilter(row, search, filter)),
    [filter, rows, search],
  );

  const stripeCaption =
    overview.stripeConnected === 0
      ? "Ingen Stripe-abonnement ennå"
      : `${overview.stripeConnected} av ${overview.total} koblet til Stripe`;

  return (
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 flex-col pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title="Abonnement"
            description="Abonnementsoperasjoner, Stripe-kobling og effektiv app-tilgang per organisasjon."
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label="Nøkkeltall"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <AdminKpiTile
              variant="subscriptions"
              label="Totalt"
              value={overview.total}
              caption={stripeCaption}
              icon={Building2}
              active={filter === "all" && !search.trim()}
              onClick={() => {
                setSearch("");
                updateFilter("all");
              }}
            />
            <AdminKpiTile
              variant="subscriptions"
              label="Prøve"
              value={overview.trialing}
              caption="Organisasjoner i prøveperiode"
              icon={Clock}
              active={filter === "trialing"}
              onClick={() => updateFilter("trialing")}
            />
            <AdminKpiTile
              variant="subscriptions"
              label="Aktiv"
              value={overview.active}
              caption="Betalt abonnement"
              icon={CreditCard}
              active={filter === "active"}
              onClick={() => updateFilter("active")}
            />
            <AdminKpiTile
              variant="subscriptions"
              label="MRR"
              value={formatNok(overview.mrrNok)}
              caption={`${formatNok(SAAS_MONTHLY_PRICE_NOK)} per aktiv org`}
              icon={TrendingUp}
              onClick={() => updateFilter("active")}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <AdminSubscriptionFilterBar
            embedded
            search={search}
            onSearchChange={updateSearch}
            filter={filter}
            onFilterChange={updateFilter}
            counts={counts}
          />
        </section>

        <div className="app-table overflow-x-auto border-t border-rn-border-strong/50">
          <table className="w-full min-w-[1024px] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={tableHeadClass}>Organisasjon</th>
                <th className={tableHeadClass}>Abonnement</th>
                <th className={tableHeadClass}>Plan</th>
                <th className={tableHeadClass}>App-tilgang</th>
                <th className={tableHeadClass}>Periode slutt</th>
                <th className={tableHeadClass}>Stripe</th>
                <th className={cn(tableHeadClass, "text-right")}>MRR</th>
                <th className={cn(tableHeadClass, "text-right")}>Medlemmer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {filtered.map((row) => {
                const access = resolveTenantAccess(
                  {
                    is_suspended: row.isSuspended,
                    subscription_status: row.subscriptionStatus,
                    current_period_end: row.periodEnd,
                    provider_subscription_id: row.providerSubscriptionId,
                  },
                  { billingEnabled },
                );
                const accessLabel = ACCESS_LABELS[access] ?? access;
                const accessTone =
                  access === "suspended"
                    ? "text-destructive"
                    : access === "billing_only"
                      ? "text-muted-foreground"
                      : access === "warning"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-success";

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors hover:bg-rn-surface-row-hover",
                      row.isSuspended && "bg-destructive/5",
                    )}
                  >
                    <td className="p-0 align-middle">
                      <AdminTableDetailLink
                        href={adminRoutes.organizationDetail(row.id)}
                        title={row.name}
                        subtitle={row.slug}
                      />
                      {row.isSuspended ? (
                        <p className="px-[length:calc(var(--app-card-padding)*0.4)] pb-2 text-app-xs font-semibold text-destructive">
                          Suspendert av admin
                        </p>
                      ) : null}
                    </td>
                    <td className={tableCellClass}>
                      {row.isSuspended || row.providerSubscriptionId ? (
                        <AdminStatusBadge status={row.subscriptionStatus} />
                      ) : (
                        <BillingStatusSelect
                          row={row}
                          disabled={false}
                          onUpdated={() => router.refresh()}
                        />
                      )}
                    </td>
                    <td className={tableCellClass}>
                      <AdminPlanBadge plan={row.subscriptionPlan} />
                    </td>
                    <td className={tableCellClass}>
                      <span className={cn("font-semibold", accessTone)}>
                        {accessLabel}
                      </span>
                    </td>
                    <td className={cn(tableCellClass, "text-muted-foreground")}>
                      {row.periodEnd
                        ? format(new Date(row.periodEnd), "d. MMM yyyy", {
                            locale: nb,
                          })
                        : "—"}
                      {row.subscriptionStatus === "trialing" && !row.isSuspended ? (
                        <button
                          type="button"
                          className="admin-ops-inline-link mt-1 block"
                          onClick={() =>
                            void (async () => {
                              const result = await extendOrganizationTrial({
                                organizationId: row.id,
                                extraDays: 7,
                              });
                              if (!result.ok) toast.error(result.error);
                              else {
                                toast.success("Prøveperiode utvidet");
                                router.refresh();
                              }
                            })()
                          }
                        >
                          +7 dager prøve
                        </button>
                      ) : null}
                    </td>
                    <td className={tableCellClass}>
                      <SubscriptionStripeCell
                        row={row}
                        onUpdated={() => router.refresh()}
                      />
                    </td>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>
                      {row.subscriptionStatus === "active" && !row.isSuspended
                        ? formatNok(SAAS_MONTHLY_PRICE_NOK)
                        : "—"}
                    </td>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>
                      {row.memberCount}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="space-y-3 px-6 py-16 text-center sm:px-10 sm:py-20 md:px-8">
                      <p className="font-heading text-lg font-bold tracking-tight text-rn-text-heading">
                        {rows.length === 0
                          ? "Ingen organisasjoner ennå"
                          : "Ingen treff i listen"}
                      </p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        {rows.length === 0
                          ? "Abonnementsdata vises når organisasjoner registreres."
                          : "Juster søket eller bytt filter. Nullstill ved å velge «Alle» og tømme søkefeltet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border-t border-rn-border-strong/50 px-4 py-3 sm:px-5 md:px-6 lg:px-8">
          <p className="app-text-secondary">
            Viser {filtered.length} av {rows.length} organisasjoner
          </p>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          Suspendert tilgang overstyrer abonnementsstatus. Endre suspensjon under
          organisasjonsdetaljer.
        </p>
      </div>
    </div>
  );
}
