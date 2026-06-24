"use client";

import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { FormSelect } from "@/components/ui/form-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRoutes } from "@/config/admin-routes";
import { ROLE_DISPLAY_LABELS, USER_ROLES, type UserRole } from "@/constants/roles";
import {
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/lib/admin/actions/users";
import type { AdminUserDetail } from "@/lib/admin/queries/users-billing-audit";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";
import { AdminTableDetailLink } from "@/components/admin/admin-table-detail-link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function UserOrganizationsTab({ user }: { user: AdminUserDetail }) {
  const router = useRouter();
  const [roleBusyOrgId, setRoleBusyOrgId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    organizationId: string;
    organizationName: string;
  } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  async function handleRoleChange(organizationId: string, role: string) {
    setRoleBusyOrgId(organizationId);
    const result = await updateOrganizationMemberRole({
      organizationId,
      userId: user.id,
      role: role as UserRole,
    });
    setRoleBusyOrgId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Rolle oppdatert");
    router.refresh();
  }

  async function handleRemoveMember() {
    if (!removeTarget) return;
    setRemoveBusy(true);
    const result = await removeOrganizationMember({
      organizationId: removeTarget.organizationId,
      userId: user.id,
    });
    setRemoveBusy(false);
    setRemoveTarget(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Fjernet fra organisasjon");
    router.refresh();
  }

  return (
    <>
      <AdminDataPanel title="Organisasjoner">
        {user.organizations.length === 0 ? (
          <p className="app-text-muted">Ingen organisasjonstilknytning.</p>
        ) : (
          <Table className="admin-ops-table">
            <TableHeader>
              <TableRow>
                <TableHead>Organisasjon</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Medlem siden</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="p-0 align-middle">
                    <AdminTableDetailLink
                      href={adminRoutes.organizationDetail(org.id)}
                      title={org.name}
                    />
                  </TableCell>
                  <TableCell>
                    <FormSelect
                      value={org.role}
                      onValueChange={(value) =>
                        void handleRoleChange(org.id, value)
                      }
                      disabled={roleBusyOrgId === org.id || removeBusy}
                      options={USER_ROLES.map((role) => ({
                        value: role,
                        label: ROLE_DISPLAY_LABELS[role],
                      }))}
                      className="max-w-[12rem] admin-table-select"
                      aria-label={`Rolle i ${org.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(org.joinedAt), "d. MMM yyyy", {
                      locale: nb,
                    })}
                  </TableCell>
                  <TableCell>
                    <AdminActionButton
                      type="button"
                      variant="ghost"
                      disabled={removeBusy || roleBusyOrgId !== null}
                      onClick={() =>
                        setRemoveTarget({
                          organizationId: org.id,
                          organizationName: org.name,
                        })
                      }
                    >
                      Fjern
                    </AdminActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminDataPanel>

      <AdminConfirmActionDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removeBusy) setRemoveTarget(null);
        }}
        title={`Fjern fra ${removeTarget?.organizationName}?`}
        description="Brukeren mister tilgang til denne organisasjonen."
        confirmLabel="Ja, fjern"
        confirmVariant="destructive"
        busy={removeBusy}
        onConfirm={() => void handleRemoveMember()}
      />
    </>
  );
}
