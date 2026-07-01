"use client";

import { useTranslation } from "@/i18n/client";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { getStripeModeLabel } from "@/lib/billing/constants";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";

import type { Locale } from "@/i18n/config";

function formatDateTime(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  return format(new Date(iso), "d. MMM yyyy HH:mm", { locale: getDateFnsLocale(locale) });
}

export function OrganizationBillingTab({
  org,
}: {
  org: AdminOrganizationDetail;
}) {
  const { t, locale } = useTranslation();
  return (
    <AdminDataPanel
      title={t("admin.stripe_fakturering")}
      action={
        org.providerCustomerId ? (
          <AdminActionButton
            nativeButton={false}
            render={
              <a
                href={`https://dashboard.stripe.com/customers/${org.providerCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            {t("adminLabels.actions.openInStripe")}
          </AdminActionButton>
        ) : undefined
      }
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.stripeMode")}</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {getStripeModeLabel()}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.stripeCustomer")}</dt>
          <dd className="mt-1 font-mono text-app-sm">
            {org.providerCustomerId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.stripeSubscription")}</dt>
          <dd className="mt-1 font-mono text-app-sm">
            {org.providerSubscriptionId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.stripePriceId")}</dt>
          <dd className="mt-1 font-mono text-app-sm">
            {org.providerPriceId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.periodStart")}</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {formatDateTime(org.subscriptionPeriodStart, locale)}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.periodEnd")}</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {formatDateTime(org.subscriptionPeriodEnd, locale)}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.trialUntil")}</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {formatDateTime(org.trialEndsAt, locale)}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.cancelAtPeriodEnd")}</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {org.cancelAtPeriodEnd ? t("adminLabels.fields.yes") : t("adminLabels.fields.no")}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.lastSynced")}</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {formatDateTime(org.lastSyncedAt, locale)}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">{t("adminLabels.fields.billingEmail")}</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {org.billingEmail ?? "—"}
          </dd>
        </div>
      </dl>
    </AdminDataPanel>
  );
}
