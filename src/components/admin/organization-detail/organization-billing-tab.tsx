import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { getStripeModeLabel } from "@/lib/billing/constants";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d. MMM yyyy HH:mm", { locale: nb });
}

export function OrganizationBillingTab({
  org,
}: {
  org: AdminOrganizationDetail;
}) {
  return (
    <AdminDataPanel
      title="Stripe / fakturering"
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
            Åpne i Stripe →
          </AdminActionButton>
        ) : undefined
      }
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="app-text-muted">Stripe-modus (miljø)</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {getStripeModeLabel()}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">Stripe-kunde</dt>
          <dd className="mt-1 font-mono text-app-sm">
            {org.providerCustomerId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">Stripe-abonnement</dt>
          <dd className="mt-1 font-mono text-app-sm">
            {org.providerSubscriptionId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">Stripe pris-ID</dt>
          <dd className="mt-1 font-mono text-app-sm">
            {org.providerPriceId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">Periode start</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {formatDateTime(org.subscriptionPeriodStart)}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">Periode slutt</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {formatDateTime(org.subscriptionPeriodEnd)}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">Prøveperiode til</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {formatDateTime(org.trialEndsAt)}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">Avsluttes ved periodeslutt</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {org.cancelAtPeriodEnd ? "Ja" : "Nei"}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">Sist synkronisert</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {formatDateTime(org.lastSyncedAt)}
          </dd>
        </div>
        <div>
          <dt className="app-text-muted">Faktura e-post</dt>
          <dd className="mt-1 font-heading text-app-md font-semibold">
            {org.billingEmail ?? "—"}
          </dd>
        </div>
      </dl>
    </AdminDataPanel>
  );
}
