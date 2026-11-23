import { BillingAccessBanner } from "@/features/billing/components/billing-access-banner";
import { BillingSettingsPanel } from "@/features/billing/components/billing-settings-panel";
import {
  getStripeModeLabel,
  isBillingEnabled,
  isSandboxBilling,
} from "@/lib/billing/constants";
import { requireOrgBillingPageAccess } from "@/lib/settings/require-settings-access";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const { isOwner } = await requireOrgBillingPageAccess();

  return (
    <div className="flex flex-col gap-6">
      <BillingAccessBanner />
      <BillingSettingsPanel
        billingEnabled={isBillingEnabled()}
        isSandbox={isSandboxBilling()}
        billingModeLabel={getStripeModeLabel()}
        isOwner={isOwner}
      />
    </div>
  );
}
