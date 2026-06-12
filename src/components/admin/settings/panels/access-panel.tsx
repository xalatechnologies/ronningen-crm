import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminTableDetailLink } from "@/components/admin/admin-table-detail-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRoutes } from "@/config/admin-routes";
import type { AdminSettingsOverview } from "@/lib/admin/queries/settings";

export function AccessPanel({
  settings,
}: {
  settings: AdminSettingsOverview;
}) {
  const { platformAdmins } = settings;

  return (
    <AdminDataPanel title="Plattformadministratorer">
      <Table className="admin-ops-table">
        <TableHeader>
          <TableRow>
            <TableHead>Bruker</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {platformAdmins.map((admin) => (
            <TableRow key={admin.id} className="p-0">
              <TableCell className="p-0">
                <AdminTableDetailLink
                  href={adminRoutes.userDetail(admin.id)}
                  title={admin.fullName ?? admin.email ?? admin.id}
                  subtitle={
                    admin.fullName && admin.email ? admin.email : undefined
                  }
                />
              </TableCell>
            </TableRow>
          ))}
          {platformAdmins.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center app-text-muted">
                Ingen plattformadministratorer funnet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </AdminDataPanel>
  );
}
