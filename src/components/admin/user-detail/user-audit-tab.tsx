import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAuditActionLabel } from "@/lib/admin/audit-labels";
import type { AdminUserDetail } from "@/lib/admin/queries/users-billing-audit";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";

export function UserAuditTab({ user }: { user: AdminUserDetail }) {
  return (
    <AdminDataPanel title="Revisjonshistorikk">
      <p className="mb-4 app-text-muted">
        Siste {user.auditEntries.length} handlinger knyttet til denne brukeren
        som mål.
      </p>
      {user.auditEntries.length === 0 ? (
        <p className="app-text-muted">
          Ingen registrerte handlinger for denne brukeren.
        </p>
      ) : (
        <Table className="admin-ops-table">
          <TableHeader>
            <TableRow>
              <TableHead>Tidspunkt</TableHead>
              <TableHead>Handling</TableHead>
              <TableHead>Mål</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {user.auditEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">
                  {format(new Date(entry.createdAt), "d. MMM yyyy HH:mm", {
                    locale: nb,
                  })}
                </TableCell>
                <TableCell>{formatAuditActionLabel(entry.action)}</TableCell>
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
