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
  const { commercial } = settings;

  return (
    <AdminDataPanel
      title="Abonnement og prising"
      action={
        <AdminLinkButton href={adminRoutes.subscriptions}>
          Abonnementer
        </AdminLinkButton>
      }
    >
      <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CommercialStat
          label="Prøveperiode"
          value={`${commercial.trialDays} dager`}
        />
        <CommercialStat
          label="Månedspris"
          value={`${commercial.monthlyPriceNok} NOK`}
        />
        <CommercialStat label="Plan" value={commercial.planId} />
        <CommercialStat
          label="Fakturering"
          value={commercial.billingEnabled ? "Aktivert" : "Deaktivert"}
        />
        <div className="sm:col-span-2 lg:col-span-2">
          <dt className="text-app-sm text-muted-foreground">Stripe pris-ID</dt>
          <dd className="mt-1 font-mono text-app-sm font-semibold">
            {commercial.stripePriceId ?? "Ikke satt"}
          </dd>
        </div>
      </dl>

      <p className="mt-6 border-t border-rn-border-strong/50 pt-4 text-app-sm text-muted-foreground">
        Endres i kode og miljøvariabler. DB-redigering kan legges til senere.
      </p>
    </AdminDataPanel>
  );
}
