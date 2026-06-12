"use client";

import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRoutes } from "@/config/admin-routes";
import { ROLE_DISPLAY_LABELS } from "@/constants/roles";
import { transferOrganizationOwnership } from "@/lib/admin/actions/users";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function OrganizationMembersTab({
  org,
}: {
  org: AdminOrganizationDetail;
}) {
  const router = useRouter();
  const [transferTarget, setTransferTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);

  async function handleTransferOwnership() {
    if (!transferTarget) return;
    setTransferBusy(true);
    const result = await transferOrganizationOwnership({
      organizationId: org.id,
      newOwnerUserId: transferTarget.userId,
    });
    setTransferBusy(false);
    setTransferTarget(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Eierskap overført");
    router.refresh();
  }

  return (
    <>
      <AdminDataPanel title="Team">
        {org.members.length === 0 ? (
          <p className="app-text-muted">Ingen medlemmer registrert.</p>
        ) : (
          <Table className="admin-ops-table">
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Medlem siden</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <Link
                      href={adminRoutes.userDetail(member.userId)}
                      className="font-heading font-semibold text-success hover:underline"
                    >
                      {member.fullName ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>{member.email ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        member.role === "owner" &&
                          "font-semibold text-success",
                      )}
                    >
                      {ROLE_DISPLAY_LABELS[
                        member.role as keyof typeof ROLE_DISPLAY_LABELS
                      ] ?? member.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(member.joinedAt), "d. MMM yyyy", {
                      locale: nb,
                    })}
                  </TableCell>
                  <TableCell>
                    {member.role !== "owner" ? (
                      <AdminActionButton
                        type="button"
                        variant="ghost"
                        disabled={transferBusy}
                        onClick={() =>
                          setTransferTarget({
                            userId: member.userId,
                            name: member.fullName ?? member.email ?? "medlem",
                          })
                        }
                      >
                        Gjør til eier
                      </AdminActionButton>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminDataPanel>

      <AdminConfirmActionDialog
        open={transferTarget !== null}
        onOpenChange={(open) => {
          if (!open && !transferBusy) setTransferTarget(null);
        }}
        title="Overfør eierskap"
        description={
          transferTarget ? (
            <>
              Gjør <strong>{transferTarget.name}</strong> til eier av{" "}
              <strong>{org.name}</strong>? Nåværende eier mister eierrollen.
            </>
          ) : null
        }
        confirmLabel="Overfør eierskap"
        confirmVariant="default"
        busy={transferBusy}
        onConfirm={() => void handleTransferOwnership()}
      />
    </>
  );
}
