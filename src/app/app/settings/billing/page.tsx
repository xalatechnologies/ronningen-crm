import { Suspense } from "react";

import { BillingAccessBanner } from "@/components/organizations/billing-access-banner";
import { BillingSettingsPanel } from "@/components/organizations/billing-settings-panel";
import {
  getStripeModeLabel,
  isBillingEnabled,
  isSandboxBilling,
} from "@/lib/billing/constants";
import { requireOrgBillingPageAccess } from "@/lib/settings/require-settings-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { isOwner } = await requireOrgBillingPageAccess(supabase);

  return (
    <div className="flex flex-col gap-6">
      <BillingAccessBanner />
      <div>
        <h1 className="app-title">Fakturering</h1>
        <p className="mt-2 text-app-base text-muted-foreground">
          Abonnement, plan og betalingsstatus for den aktive organisasjonen.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Laster abonnement…</p>}>
        <BillingSettingsPanel
          billingEnabled={isBillingEnabled()}
          isSandbox={isSandboxBilling()}
          billingModeLabel={getStripeModeLabel()}
          isOwner={isOwner}
        />
      </Suspense>
    </div>
  );
}
