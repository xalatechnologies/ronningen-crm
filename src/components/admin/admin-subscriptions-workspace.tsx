"use client";

import { useTranslation } from "@/i18n/client";
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
import {
  subscriptionStatusLabel,
  tenantAccessLabel,
} from "@/lib/admin/subscription-labels";
import type { AdminBillingRow } from "@/lib/admin/queries/users-billing-audit";
import { formatNok } from "@/lib/admin/revenue-metrics";
import { SAAS_MONTHLY_PRICE_NOK } from "@/lib/billing/constants";
import { resolveTenantAccess } from "@/lib/subscriptions/subscription-utils";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import {
  Building2,
  Clock,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const kpiTileClass =
  "flex flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-6 shadow-sm";

const tableHeadClass =
  "px-6 py-4 text-left text-app-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 align-middle md:px-8 md:py-6";

function SubscriptionsKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  active,
  onClick,
  iconContainerClassName = "rounded-md bg-accent p-2 dark:bg-white/10",
  iconClassName = "size-6 text-primary dark:text-white",
  valueClassName = "text-success",
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
  iconContainerClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        kpiTileClass,
        "group w-full text-left transition-colors hover:border-success/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30",
        active && "border-success/40 bg-muted/20 ring-2 ring-success/25",
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="dashboard-kpi-label">{label}</span>
        <div className={iconContainerClassName}>
          <Icon className={iconClassName} aria-hidden />
        </div>
      </div>
      <div>
        <p className={cn("dashboard-kpi-value", valueClassName)}>{value}</p>
        <p className="dashboard-kpi-caption mt-3 text-muted-foreground">{caption}</p>
      </div>
    </button>
  );
}

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
  const { t, locale } = useTranslation();
  const [busy, setBusy] = useState(false);
  const statusOptions = useMemo(
    () =>
      ADMIN_SETTABLE_SUBSCRIPTION_STATUSES.map((value) => ({
        value,
        label: subscriptionStatusLabel(value, t),
      })),
    [t],
  );

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
      toast.error(t("admin.kunne_ikke_oppdatere_abonnement"), {
        description: result.error,
      });
      return;
    }

    toast.success(t("admin.abonnementsstatus_oppdatert"));
    onUpdated();
  }

  return (
    <FormSelect
      value={row.subscriptionStatus}
      onValueChange={(value) => void handleChange(value)}
      options={statusOptions}
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
  const { t, locale } = useTranslation();
  if (!row.providerSubscriptionId) {
    return <span className="text-muted-foreground">{t("adminLabels.connection.notConnected")}</span>;
  }

  return (
    <div>
      <span className="font-semibold text-success">{t("adminLabels.connection.connected")}</span>
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
          {t("admin.apne_stripe")}
        </button>
        <button
          type="button"
          className="admin-ops-inline-link"
          onClick={() =>
            void (async () => {
              const result = await retrySubscriptionPayment(row.id);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success(t("admin.betaling_forsokt"));
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
  const { t, locale } = useTranslation();
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
      ? t("admin.ingen_stripe_abonnement_enna")
      : t("admin.stripe_connected_caption", {
          connected: overview.stripeConnected,
          total: overview.total,
        });

  return (
    <div className="admin-page-workspace admin-subscriptions-dashboard mx-auto flex w-full min-w-0 flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title={t("admin.abonnement")}
            description={t("admin.abonnementsoperasjoner_stripe_kobling_og_effektiv_app_tilgan")}
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label={t("admin.nokkeltall")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <SubscriptionsKpiTile
              label={t("admin.totalt")}
              value={overview.total}
              caption={stripeCaption}
              icon={Building2}
              active={filter === "all" && !search.trim()}
              onClick={() => {
                setSearch("");
                updateFilter("all");
              }}
            />
            <SubscriptionsKpiTile
              label={t("admin.prove")}
              value={overview.trialing}
              caption={t("admin.organisasjoner_i_proveperiode")}
              icon={Clock}
              active={filter === "trialing"}
              onClick={() => updateFilter("trialing")}
            />
            <SubscriptionsKpiTile
              label={t("admin.aktiv")}
              value={overview.active}
              caption={t("admin.betalt_abonnement")}
              icon={CreditCard}
              active={filter === "active"}
              onClick={() => updateFilter("active")}
            />
            <SubscriptionsKpiTile
              label="MRR"
              value={formatNok(overview.mrrNok)}
              caption={t("admin.per_active_org", {
                amount: formatNok(SAAS_MONTHLY_PRICE_NOK),
              })}
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
                <th className={tableHeadClass}>{t("adminLabels.fields.organization")}</th>
                <th className={tableHeadClass}>{t("admin.abonnement")}</th>
                <th className={tableHeadClass}>{t("admin.plan")}</th>
                <th className={tableHeadClass}>{t("admin.app_tilgang")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.periodEnd")}</th>
                <th className={tableHeadClass}>Stripe</th>
                <th className={cn(tableHeadClass, "text-right")}>MRR</th>
                <th className={cn(tableHeadClass, "text-right")}>{t("admin.medlemmer")}</th>
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
                const accessLabel = tenantAccessLabel(access, t);
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
                            locale: getDateFnsLocale(locale),
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
                                toast.success(t("admin.proveperiode_utvidet"));
                                router.refresh();
                              }
                            })()
                          }
                        >
                          {t("admin.extend_trial_days_badge")}
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
                          ? t("admin.ingen_organisasjoner_enna")
                          : t("admin.ingen_treff_i_listen")}
                      </p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        {rows.length === 0
                          ? t("admin.abonnementsdata_vises_nar_organisasjoner_registreres")
                          : t("admin.juster_soket_eller_bytt_filter_nullstill_ved_a_velge_alle_og")}
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
            {t("admin.viser_av_organisasjoner", {
              shown: filtered.length,
              total: rows.length,
            })}
          </p>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          {t("admin.subscriptions_workspace_footer")}
        </p>
      </div>
    </div>
  );
}
