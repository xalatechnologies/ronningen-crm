import { OrganizationAccessPanel } from "@/components/admin/organization-access-panel";
import { OrganizationSubscriptionForm } from "@/components/admin/organization-subscription-form";
import { OrganizationSubscriptionPeriodForm } from "@/components/admin/organization-subscription-period-form";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";

export function OrganizationSubscriptionTab({
  org,
  billingEnabled = false,
}: {
  org: AdminOrganizationDetail;
  billingEnabled?: boolean;
}) {
  return (
    <div className="grid gap-[length:var(--spacing-app-gap)] lg:grid-cols-2">
      <OrganizationAccessPanel
        organizationId={org.id}
        isSuspended={org.isSuspended}
        subscriptionStatus={org.subscriptionStatus}
        suspendedReason={org.suspendedReason}
        providerSubscriptionId={org.providerSubscriptionId}
        billingEnabled={billingEnabled}
      />
      <OrganizationSubscriptionForm
        organizationId={org.id}
        subscriptionStatus={org.subscriptionStatus}
        subscriptionPlan={org.subscriptionPlan}
      />
      <OrganizationSubscriptionPeriodForm
        organizationId={org.id}
        periodEnd={org.subscriptionPeriodEnd}
        periodStart={org.subscriptionPeriodStart}
      />
    </div>
  );
}
