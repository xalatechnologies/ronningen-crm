"use client";

import { useTranslation } from "@/i18n/client";
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
import { roleLabel } from "@/lib/navigation/nav-labels";
import { transferOrganizationOwnership } from "@/lib/admin/actions/users";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function OrganizationMembersTab({
  org,
}: {
  org: AdminOrganizationDetail;
}) {
  const { t, locale } = useTranslation();
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
    toast.success(t("admin.eierskap_overfort"));
    router.refresh();
  }

  return (
    <>
      <AdminDataPanel title={t("admin.team")}>
        {org.members.length === 0 ? (
          <p className="app-text-muted">{t("adminLabels.empty.noMembers")}</p>
        ) : (
          <Table className="admin-ops-table">
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminLabels.fields.name")}</TableHead>
                <TableHead>{t("admin.e_post")}</TableHead>
                <TableHead>{t("adminLabels.fields.role")}</TableHead>
                <TableHead>{t("adminLabels.fields.memberSince")}</TableHead>
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
                      {roleLabel(member.role, t)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(member.joinedAt), "d. MMM yyyy", {
                      locale: getDateFnsLocale(locale),
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
        title={t("admin.overfor_eierskap")}
        description={
          transferTarget ? (
            <>
              Gjør <strong>{transferTarget.name}</strong> til eier av{" "}
              <strong>{org.name}</strong>? Nåværende eier mister eierrollen.
            </>
          ) : null
        }
        confirmLabel={t("admin.overfor_eierskap")}
        confirmVariant="default"
        busy={transferBusy}
        onConfirm={() => void handleTransferOwnership()}
      />
    </>
  );
}
