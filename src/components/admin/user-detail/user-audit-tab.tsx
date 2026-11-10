"use client";

import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/i18n/client";
import { formatAuditActionLabel } from "@/lib/admin/audit-labels";
import type { AdminUserDetail } from "@/lib/admin/queries/users-billing-audit";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";

export function UserAuditTab({ user }: { user: AdminUserDetail }) {
  const { t, locale } = useTranslation();

  return (
    <AdminDataPanel title={t("admin.revisjonshistorikk")}>
      <p className="mb-4 app-text-muted">
        {t("admin.user_audit_recent_actions", {
          count: user.auditEntries.length,
        })}
      </p>
      {user.auditEntries.length === 0 ? (
        <p className="app-text-muted">
          {t("adminLabels.empty.noUserAudit")}
        </p>
      ) : (
        <Table className="admin-ops-table">
          <TableHeader>
            <TableRow>
              <TableHead>{t("adminLabels.fields.timestamp")}</TableHead>
              <TableHead>{t("adminLabels.fields.action")}</TableHead>
              <TableHead>{t("adminLabels.fields.target")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {user.auditEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">
                  {format(new Date(entry.createdAt), "d. MMM yyyy HH:mm", {
                    locale: getDateFnsLocale(locale),
                  })}
                </TableCell>
                <TableCell>{formatAuditActionLabel(entry.action, t)}</TableCell>
                <TableCell className="font-mono text-app-xs text-muted-foreground">
                  {entry.targetId ?? entry.targetType}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminDataPanel>
  );
}
