import { AdminOrganizationsWorkspace } from "@/components/admin/admin-organizations-workspace";
import { fetchAdminOrganizations } from "@/lib/admin/queries/organizations";
import type { AdminOrgFilterStatus } from "@/components/admin/admin-org-filters";
import { isBillingEnabled } from "@/lib/billing/constants";
type PageProps = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

function parseStatus(value: string | undefined): AdminOrgFilterStatus {
  if (
    value === "active" ||
    value === "incomplete" ||
    value === "suspended" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "enterprise"
  ) {
    return value;
  }
  return "all";
}

export default async function AdminOrganizationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const organizations = await fetchAdminOrganizations();

  return (
    <AdminOrganizationsWorkspace
      organizations={organizations}
      initialStatus={parseStatus(params.status)}
      initialSearch={params.q ?? ""}
      billingEnabled={isBillingEnabled()}
    />
  );
}
