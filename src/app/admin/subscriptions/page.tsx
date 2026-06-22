import { AdminSubscriptionsWorkspace } from "@/components/admin/admin-subscriptions-workspace";
import type { AdminSubscriptionFilter } from "@/components/admin/admin-subscription-filters";
import { fetchAdminBillingOverview } from "@/lib/admin/queries/users-billing-audit";
import { isBillingEnabled } from "@/lib/billing/constants";
type PageProps = {
  searchParams: Promise<{ filter?: string; q?: string }>;
};

function parseFilter(value: string | undefined): AdminSubscriptionFilter {
  if (
    value === "active" ||
    value === "trialing" ||
    value === "incomplete" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "suspended"
  ) {
    return value;
  }
  return "all";
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const rows = await fetchAdminBillingOverview();

  return (
    <AdminSubscriptionsWorkspace
      rows={rows}
      initialFilter={parseFilter(params.filter)}
      initialSearch={params.q ?? ""}
      billingEnabled={isBillingEnabled()}
    />
  );
}
