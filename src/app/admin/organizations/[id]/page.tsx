import { OrganizationDetailWorkspace } from "@/components/admin/organization-detail-workspace";
import { parseOrganizationDetailTab } from "@/components/admin/organization-detail/tabs";
import { fetchAdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { isBillingEnabled } from "@/lib/billing/constants";
import { fetchAdminOrgSupportTickets } from "@/lib/support/queries";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminOrganizationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const initialTab = parseOrganizationDetailTab(tabParam);

  const [org, supportTickets] = await Promise.all([
    fetchAdminOrganizationDetail(id),
    fetchAdminOrgSupportTickets(id),
  ]);

  if (!org) notFound();

  return (
    <OrganizationDetailWorkspace
      org={org}
      supportTickets={supportTickets}
      initialTab={initialTab}
      billingEnabled={isBillingEnabled()}
    />
  );
}
