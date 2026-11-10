"use client";

import { useTranslation } from "@/i18n/client";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminLinkButton } from "@/components/admin/admin-action-button";
import { adminRoutes } from "@/config/admin-routes";
import type { AdminSettingsOverview } from "@/lib/admin/queries/settings";

function CommercialStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-app-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-lg font-semibold">{value}</dd>
    </div>
  );
}

export function CommercialPanel({
  settings,
}: {
  settings: AdminSettingsOverview;
}) {
  const { t } = useTranslation();
  const { commercial } = settings;

  return (
    <AdminDataPanel
      title={t("admin.abonnement_og_prising")}
      action={
        <AdminLinkButton href={adminRoutes.subscriptions}>
          {t("adminLabels.fields.subscriptions")}
        </AdminLinkButton>
      }
    >
      <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CommercialStat
          label={t("admin.proveperiode")}
          value={t("admin.trial_days_count", { days: commercial.trialDays })}
        />
        <CommercialStat
          label={t("admin.manedspris")}
          value={`${commercial.monthlyPriceNok} NOK`}
        />
        <CommercialStat label={t("admin.plan")} value={commercial.planId} />
        <CommercialStat
          label={t("admin.fakturering")}
          value={commercial.billingEnabled ? t("admin.aktivert") : t("admin.deaktivert")}
        />
        <div className="sm:col-span-2 lg:col-span-2">
          <dt className="text-app-sm text-muted-foreground">{t("adminLabels.fields.stripePriceId")}</dt>
          <dd className="mt-1 font-mono text-app-sm font-semibold">
            {commercial.stripePriceId ?? t("admin.ikke_satt")}
          </dd>
        </div>
      </dl>

      <p className="mt-6 border-t border-rn-border-strong/50 pt-4 text-app-sm text-muted-foreground">
        {t("admin.commercial_config_footer")}
      </p>
    </AdminDataPanel>
  );
}
