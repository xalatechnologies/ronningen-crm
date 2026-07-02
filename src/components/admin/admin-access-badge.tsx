"use client";

import { useTranslation } from "@/i18n/client";
import { AdminStatusBadge } from "@/components/admin/admin-badges";
import { tenantAccessLabel } from "@/lib/admin/subscription-labels";
import { resolveTenantAccess } from "@/lib/subscriptions/subscription-utils";
import { cn } from "@/lib/utils";

export function AdminAccessBadge({
  isSuspended,
  subscriptionStatus,
  providerSubscriptionId = null,
  billingEnabled = false,
  billingExempt = false,
  className,
}: {
  isSuspended: boolean;
  subscriptionStatus: string;
  providerSubscriptionId?: string | null;
  billingEnabled?: boolean;
  billingExempt?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const access = resolveTenantAccess(
    {
      is_suspended: isSuspended,
      subscription_status: subscriptionStatus,
      provider_subscription_id: providerSubscriptionId,
      billing_exempt: billingExempt,
    },
    { billingEnabled },
  );

  if (access === "suspended") {
    return (
      <span
        className={cn(
          "inline-flex rounded-md border-2 border-destructive/40 bg-destructive/10 px-3 py-1 text-app-xs font-semibold text-destructive md:text-app-sm",
          className,
        )}
      >
        {tenantAccessLabel("suspended", t)}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <AdminStatusBadge status={subscriptionStatus} />
      <span className="text-app-xs font-medium text-muted-foreground md:text-app-sm">
        {tenantAccessLabel(access, t)}
      </span>
    </div>
  );
}
