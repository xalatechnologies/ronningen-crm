import { OrgsWorkspace } from "@/features/admin-organizations/components/orgs-workspace";
import { fetchAdminOrganizations } from "@/lib/admin/queries/organizations";
import { isBillingEnabled } from "@/lib/billing/constants";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const organizations = await fetchAdminOrganizations();
  return <OrgsWorkspace organizations={organizations} nowIso={new Date().toISOString()} billingEnabled={isBillingEnabled()} />;
}
