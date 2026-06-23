import { Suspense } from "react";

import { BillingAccessBanner } from "@/components/organizations/billing-access-banner";
import { BillingSettingsPanel } from "@/components/organizations/billing-settings-panel";
import {
  getStripeModeLabel,
  isBillingEnabled,
  isSandboxBilling,
} from "@/lib/billing/constants";
import { requireOrgBillingPageAccess } from "@/lib/settings/require-settings-access";

export const dynamic = "force-dynamic";

function BillingSettingsFallback() {
  return (
    <p className="text-muted-foreground" aria-busy="true">
      Laster abonnement…
    </p>
  );
}

export default async function BillingSettingsPage() {
  const { isOwner } = await requireOrgBillingPageAccess();

  return (
    <div className="flex flex-col gap-6">
      <BillingAccessBanner />
      <Suspense fallback={<BillingSettingsFallback />}>
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
