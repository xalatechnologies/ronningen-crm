"use client";

import { useTranslation } from "@/i18n/client";
import { AdminPlanBadge, AdminStatusBadge } from "@/components/admin/admin-badges";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { FormSelect } from "@/components/ui/form-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ADMIN_SETTABLE_SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_PLANS,
  type AdminSettableSubscriptionStatus,
  type SubscriptionPlan,
} from "@/constants/roles";
import { adminRoutes } from "@/config/admin-routes";
import { updateOrganizationSubscription } from "@/lib/admin/actions/organization-subscription";
import { subscriptionStatusLabel, tenantAccessLabel } from "@/lib/admin/subscription-labels";
import type { AdminBillingRow } from "@/lib/admin/queries/users-billing-audit";
import { resolveTenantAccess } from "@/lib/subscriptions/subscription-utils";
import {
  AdminSegmentFilterBar,
  AdminSegmentFilterControls,
  adminSegmentFilterButtonClass,
} from "@/components/admin/admin-segment-filter-bar";
import { RN_ADMIN_DETAIL_LINK, RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type BillingFilter =
  | "all"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "suspended";

function matchesFilter(row: AdminBillingRow, filter: BillingFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "suspended":
      return row.isSuspended;
    default:
      return !row.isSuspended && row.subscriptionStatus === filter;
  }
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

export function AdminBillingWorkspace({ rows }: { rows: AdminBillingRow[] }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState<BillingFilter>("all");
  const filterOptions = useMemo(
    () => [
      { value: "all" as const, label: t("admin.alle") },
      { value: "active" as const, label: t("admin.aktiv") },
      { value: "trialing" as const, label: t("admin.prove") },
      { value: "past_due" as const, label: t("admin.forfalt") },
      { value: "canceled" as const, label: t("admin.avsluttet") },
      { value: "suspended" as const, label: t("admin.suspendert") },
    ],
    [t],
  );

  const counts = useMemo(() => {
    const result: Record<BillingFilter, number> = {
      all: rows.length,
      active: 0,
      trialing: 0,
      past_due: 0,
      canceled: 0,
      suspended: 0,
    };
    for (const row of rows) {
      if (row.isSuspended) {
        result.suspended += 1;
        continue;
      }
      if (row.subscriptionStatus in result) {
        result[row.subscriptionStatus as Exclude<BillingFilter, "all" | "suspended">] += 1;
      }
    }
    return result;
  }, [rows]);

  const filtered = useMemo(
    () => rows.filter((row) => matchesFilter(row, filter)),
    [filter, rows],
  );

  return (
    <AdminPageShell
      title={t("admin.abonnement")}
      description={t("admin.administrer_abonnementsstatus_og_se_effektiv_app_tilgang_per")}
    >
      <AdminSegmentFilterBar>
        <AdminSegmentFilterControls
          aria-label={t("admin.filtrer_abonnement")}
          className="sm:justify-start"
        >
          {filterOptions.map((option) => {
            const count = counts[option.value];
            const active = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
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

      <AdminDataPanel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("adminLabels.fields.organization")}</TableHead>
              <TableHead>{t("admin.abonnement")}</TableHead>
              <TableHead>{t("admin.plan")}</TableHead>
              <TableHead>{t("admin.app_tilgang")}</TableHead>
              <TableHead>{t("adminLabels.fields.periodEnd")}</TableHead>
              <TableHead>Stripe</TableHead>
              <TableHead className="text-right">{t("admin.medlemmer")}</TableHead>
              <TableHead>{t("adminLabels.fields.changeStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const access = resolveTenantAccess({
                is_suspended: row.isSuspended,
                subscription_status: row.subscriptionStatus,
                current_period_end: row.periodEnd,
                provider_subscription_id: row.providerSubscriptionId,
              });
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
                <TableRow
                  key={row.id}
                  className={row.isSuspended ? "bg-destructive/5" : undefined}
                >
                  <TableCell>
                    <Link
                      href={adminRoutes.organizationDetail(row.id)}
                      className={RN_ADMIN_DETAIL_LINK}
                    >
                      {row.name}
                    </Link>
                    {row.isSuspended ? (
                      <p className="mt-1 text-app-xs font-semibold text-destructive">
                        Suspendert av admin
                      </p>
                    ) : null}
                    {row.providerSubscriptionId ? (
                      <p className="mt-1 font-mono text-app-xs text-muted-foreground">
                        {t("adminLabels.stripe.active")}
                      </p>
                    ) : (
                      <p
                        className="mt-1 text-app-xs text-muted-foreground"
                        title={t("admin.ma_fullfore_checkout_for_proveperioden_utloper_ellers_stenge")}
                      >
                        {t("adminLabels.connection.noStripeLink")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge status={row.subscriptionStatus} />
                  </TableCell>
                  <TableCell>
                    <AdminPlanBadge plan={row.subscriptionPlan} />
                  </TableCell>
                  <TableCell>
                    <span className={cn("font-semibold", accessTone)}>
                      {accessLabel}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.periodEnd
                      ? format(new Date(row.periodEnd), "d. MMM yyyy", {
                          locale: getDateFnsLocale(locale),
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate font-mono text-app-xs text-muted-foreground">
                    {row.providerSubscriptionId ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.memberCount}
                  </TableCell>
                  <TableCell>
                    {row.isSuspended ? (
                      <Link
                        href={adminRoutes.organizationDetail(row.id)}
                        className={RN_ADMIN_DETAIL_LINK}
                      >
                        Administrer tilgang
                      </Link>
                    ) : row.providerSubscriptionId ? (
                      <span
                        className="text-app-sm text-muted-foreground"
                        title={t("admin.status_styres_av_stripe_endre_under_organisasjonsdetaljer_ve")}
                      >
                        Stripe styrer status
                      </span>
                    ) : (
                      <BillingStatusSelect
                        row={row}
                        disabled={false}
                        onUpdated={() => router.refresh()}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center app-text-muted"
                >
                  {t("adminLabels.empty.noOrgsInFilter")}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <p className="mt-4 border-t border-border pt-4 app-text-secondary">
          {t("admin.viser_av_organisasjoner", {
            shown: filtered.length,
            total: rows.length,
          })}
        </p>
      </AdminDataPanel>

      <p className={cn("px-1 app-text-muted", RN_CARD_SHELL, "py-3 px-4")}>
        Suspendert tilgang overstyrer abonnementsstatus. Endre suspensjon under
        organisasjonsdetaljer.
      </p>
    </AdminPageShell>
  );
}
