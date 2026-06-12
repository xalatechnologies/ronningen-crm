import { AdminStatusBadge } from "@/components/admin/admin-badges";
import { resolveTenantAccess } from "@/lib/subscriptions/subscription-utils";
import { cn } from "@/lib/utils";

const ACCESS_LABELS: Record<string, string> = {
  full: "Full tilgang",
  warning: "Advarsel (forfalt)",
  billing_only: "Kun fakturering",
  suspended: "Suspendert",
};

export function AdminAccessBadge({
  isSuspended,
  subscriptionStatus,
  providerSubscriptionId = null,
  billingEnabled = false,
  className,
}: {
  isSuspended: boolean;
  subscriptionStatus: string;
  providerSubscriptionId?: string | null;
  billingEnabled?: boolean;
  className?: string;
}) {
  const access = resolveTenantAccess(
    {
      is_suspended: isSuspended,
      subscription_status: subscriptionStatus,
      provider_subscription_id: providerSubscriptionId,
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
        {ACCESS_LABELS.suspended}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <AdminStatusBadge status={subscriptionStatus} />
      <span className="text-app-xs font-medium text-muted-foreground md:text-app-sm">
        {ACCESS_LABELS[access] ?? access}
      </span>
    </div>
  );
}
