import { AdminLinkButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminSupportHref } from "@/lib/admin/dashboard-links";
import type { AdminOrgSupportTicketSummary } from "@/lib/support/queries";
import {
  isSupportTicketCategory,
  isSupportTicketStatus,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
} from "@/lib/support/labels";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export function OrganizationSupportTicketsPanel({
  organizationSlug,
  tickets,
}: {
  organizationSlug: string;
  tickets: AdminOrgSupportTicketSummary[];
}) {
  return (
    <AdminDataPanel
      title="Support-saker"
      action={
        <AdminLinkButton href={adminSupportHref("all", organizationSlug)}>
          Alle saker
        </AdminLinkButton>
      }
    >
      <p className="mb-4 app-text-muted">
        Strukturerte saker mellom organisasjonen og plattformsupport.
      </p>
      {tickets.length === 0 ? (
        <p className="app-text-muted">Ingen support-saker for denne organisasjonen.</p>
      ) : (
        <Table className="admin-ops-table">
          <TableHeader>
            <TableRow>
              <TableHead>Emne</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Oppdatert</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const status = isSupportTicketStatus(ticket.status)
                ? ticket.status
                : "open";
              const category = isSupportTicketCategory(ticket.category)
                ? ticket.category
                : "other";

              return (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.subject}</TableCell>
                  <TableCell>{SUPPORT_CATEGORY_LABELS[category]}</TableCell>
                  <TableCell>{SUPPORT_STATUS_LABELS[status]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(ticket.updatedAt), "d. MMM yyyy HH:mm", {
                      locale: nb,
                    })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </AdminDataPanel>
  );
}
