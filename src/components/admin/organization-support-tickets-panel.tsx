"use client";

import { useTranslation } from "@/i18n/client";
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
  supportCategoryLabel,
  supportStatusLabel,
} from "@/lib/support/labels";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";

export function OrganizationSupportTicketsPanel({
  organizationSlug,
  tickets,
}: {
  organizationSlug: string;
  tickets: AdminOrgSupportTicketSummary[];
}) {
  const { t, locale } = useTranslation();
  return (
    <AdminDataPanel
      title={t("admin.support_saker")}
      action={
        <AdminLinkButton href={adminSupportHref("all", organizationSlug)}>
          {t("adminLabels.actions.allCases")}
        </AdminLinkButton>
      }
    >
      <p className="mb-4 app-text-muted">
        {t("admin.support_tickets_desc")}
      </p>
      {tickets.length === 0 ? (
        <p className="app-text-muted">{t("adminLabels.empty.noSupportTickets")}</p>
      ) : (
        <Table className="admin-ops-table">
          <TableHeader>
            <TableRow>
              <TableHead>{t("adminLabels.fields.subject")}</TableHead>
              <TableHead>{t("admin.kategori")}</TableHead>
              <TableHead>{t("admin.status")}</TableHead>
              <TableHead>{t("admin.oppdatert")}</TableHead>
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
                  <TableCell>{supportCategoryLabel(category, t)}</TableCell>
                  <TableCell>{supportStatusLabel(status, t)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(ticket.updatedAt), "d. MMM yyyy HH:mm", {
                      locale: getDateFnsLocale(locale),
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
