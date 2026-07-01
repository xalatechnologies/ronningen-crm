"use client";

import { USER_ROLES, type UserRole } from "@/constants/roles";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useTranslation } from "@/i18n/client";
import { notifyTeamMemberAdded } from "@/lib/notifications/actions/org-events";
import { roleLabel } from "@/lib/navigation/nav-labels";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  APP_TABLE_CELL_DATE,
  APP_TABLE_CELL_PRIMARY,
} from "@/lib/table-typography";
import {
  teamMemberAddSchema,
  type TeamMemberAddInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export type TeamMemberRow = {
  id: string;
  userId: string;
  role: UserRole;
  createdAtIso: string;
  fullName: string | null;
  email: string | null;
};

const ASSIGNABLE_ROLES = USER_ROLES.filter((r) => r !== "owner");

export function TeamMembersSection({
  members: initialMembers,
}: {
  members: TeamMemberRow[];
}) {
  const { t, formatDate } = useTranslation();
  const supabase = useSupabase();
  const router = useRouter();
  const { user } = useAuthUser();
  const { currentOrganizationId } = useCurrentOrganization();
  const [members, setMembers] = useState(initialMembers);

  const roleOptions = useMemo(
    () =>
      ASSIGNABLE_ROLES.map((r) => ({
        value: r,
        label: roleLabel(r, t),
      })),
    [t],
  );

  const allRoleOptions = useMemo(
    () =>
      USER_ROLES.map((r) => ({
        value: r,
        label: roleLabel(r, t),
      })),
    [t],
  );

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberRow | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);

  const addForm = useForm<TeamMemberAddInput>({
    resolver: zodResolver(teamMemberAddSchema),
    defaultValues: { email: "", role: "manager" },
  });

  const ownerCount = useMemo(
    () => members.filter((m) => m.role === "owner").length,
    [members],
  );

  async function onAddMember(data: TeamMemberAddInput) {
    if (!supabase) return;
    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
      );
      return;
    }

    setAddBusy(true);
    try {
      const { data: userId, error: lookupError } = await supabase.rpc(
        "find_user_id_by_email",
        { lookup_email: data.email },
      );

      if (lookupError) {
        toast.error(t("settings.team.lookupFailed"), {
          description: lookupError.message,
        });
        return;
      }

      if (!userId) {
        toast.error(t("settings.team.userNotFound"), {
          description: t("settings.team.noAccount"),
        });
        return;
      }

      if (members.some((m) => m.userId === userId)) {
        toast.error(t("settings.team.alreadyMember"));
        return;
      }

      const { error } = await supabase.from("organization_members").insert({
        organization_id: orgId,
        user_id: userId,
        role: data.role,
      });

      if (error) {
        toast.error(t("settings.team.addFailed"), {
          description: error.message,
        });
        return;
      }

      void notifyTeamMemberAdded({
        organizationId: orgId,
        userId,
      });

      toast.success(t("settings.team.memberAdded"));
      addForm.reset({ email: "", role: "manager" });
      router.refresh();
    } finally {
      setAddBusy(false);
    }
  }

  async function onRoleChange(member: TeamMemberRow, nextRole: string) {
    if (!supabase || member.role === nextRole) return;

    if (member.role === "owner" && ownerCount <= 1 && nextRole !== "owner") {
      toast.error(t("settings.team.cannotChangeRole"), {
        description: t("settings.team.minOwner"),
      });
      return;
    }

    setRoleBusyId(member.id);
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: nextRole })
        .eq("id", member.id);

      if (error) {
        toast.error(t("settings.team.updateRoleFailed"), { description: error.message });
        return;
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, role: nextRole as UserRole } : m,
        ),
      );
      toast.success(t("settings.team.roleUpdated"));
      router.refresh();
    } finally {
      setRoleBusyId(null);
    }
  }

  async function confirmRemoveMember() {
    if (!supabase || !removeTarget) return;

    if (removeTarget.role === "owner" && ownerCount <= 1) {
      toast.error(t("settings.team.cannotRemoveLastOwner"));
      return;
    }

    if (removeTarget.userId === user?.id) {
      toast.error(t("settings.team.cannotRemoveSelf"));
      return;
    }

    setRemoveBusy(true);
    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", removeTarget.id);

      if (error) {
        toast.error(t("settings.team.removeFailed"), { description: error.message });
        return;
      }

      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      toast.success(t("settings.team.memberRemoved"));
      setRemoveTarget(null);
      router.refresh();
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void addForm.handleSubmit(onAddMember)();
        }}
        className={cn("flex flex-col gap-4 p-6 md:p-8", RN_CARD_SHELL)}
      >
        <h2 className="font-heading text-lg font-bold">{t("settings.team.addTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("settings.team.addDescription")}
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-4 md:flex-row md:flex-nowrap md:items-center md:gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <Label
                htmlFor="team-email"
                className="shrink-0 text-sm font-semibold md:w-14"
              >
                {t("common.fields.email")}
              </Label>
              <Input
                id="team-email"
                type="email"
                className="h-12 min-h-12 w-full min-w-0 rounded-md border-2 border-rn-border-strong md:flex-1"
                {...addForm.register("email")}
              />
            </div>
            <div className="flex shrink-0 flex-col gap-2 md:w-52 md:flex-row md:items-center md:gap-3">
              <Label
                htmlFor="team-role"
                className="shrink-0 text-sm font-semibold md:w-12"
              >
                {t("settings.team.role")}
              </Label>
              <FormSelect
                id="team-role"
                value={addForm.watch("role")}
                onValueChange={(v) =>
                  addForm.setValue("role", v as TeamMemberAddInput["role"])
                }
                options={roleOptions}
                className="h-12 min-h-12 w-full md:min-w-0 md:flex-1"
              />
            </div>
            <Button
              type="submit"
              variant="success"
              disabled={addBusy}
              className="h-12 min-h-12 w-full shrink-0 gap-2 px-5 font-semibold md:w-auto"
            >
              <UserPlus className="size-5 shrink-0" aria-hidden />
              {t("settings.team.addButton")}
            </Button>
          </div>
          {addForm.formState.errors.email ? (
            <p className="text-sm text-destructive">
              {addForm.formState.errors.email.message}
            </p>
          ) : null}
        </div>
      </form>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.fields.name")}</TableHead>
              <TableHead>{t("common.fields.email")}</TableHead>
              <TableHead>{t("settings.team.tableRole")}</TableHead>
              <TableHead>{t("settings.team.tableMemberSince")}</TableHead>
              <TableHead className="w-28 text-right">
                <span className="sr-only">{t("settings.team.tableActions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className={APP_TABLE_CELL_PRIMARY}>
                  {m.fullName?.trim() || "—"}
                </TableCell>
                <TableCell className="font-medium">{m.email ?? "—"}</TableCell>
                <TableCell>
                  {m.role === "owner" ? (
                    <span className="font-medium">
                      {roleLabel("owner", t)}
                    </span>
                  ) : (
                    <FormSelect
                      value={m.role}
                      onValueChange={(v) => void onRoleChange(m, v)}
                      disabled={roleBusyId === m.id}
                      options={allRoleOptions.filter((o) => o.value !== "owner")}
                      className="h-10 min-h-10 text-sm"
                    />
                  )}
                </TableCell>
                <TableCell className={APP_TABLE_CELL_DATE}>
                  {formatDate(m.createdAtIso)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    disabled={m.userId === user?.id}
                    onClick={() => setRemoveTarget(m)}
                  >
                    {t("settings.team.remove")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDeleteDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={t("settings.team.removeTitle")}
        description={
          removeTarget
            ? t("settings.team.removeDescription", {
                name:
                  removeTarget.fullName ??
                  removeTarget.email ??
                  t("settings.team.memberFallback"),
              })
            : null
        }
        confirmLabel={t("settings.team.removeConfirm")}
        busy={removeBusy}
        onConfirm={confirmRemoveMember}
      />
    </div>
  );
}
