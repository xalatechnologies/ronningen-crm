import { OrganizationAdminNotesPanel } from "@/components/admin/organization-admin-notes-panel";
import { OrganizationSupportTicketsPanel } from "@/components/admin/organization-support-tickets-panel";
import type { AdminOrgSupportTicketSummary } from "@/lib/support/queries";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";

export function OrganizationSupportTab({
  org,
  supportTickets,
}: {
  org: AdminOrganizationDetail;
  supportTickets: AdminOrgSupportTicketSummary[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <OrganizationSupportTicketsPanel
        organizationSlug={org.slug}
        tickets={supportTickets}
      />
      <OrganizationAdminNotesPanel
        organizationId={org.id}
        initialNotes={org.adminNotes}
      />
    </div>
  );
}
