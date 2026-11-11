"use client";

import { USER_ROLES, type UserRole } from "@/constants/roles";
import {
  assignableRoles,
  canChangeMemberRole,
  canRemoveMember,
} from "@/lib/organizations/organization-permissions";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
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
import {
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "@/lib/organizations/invitations/actions";
import type { PendingInvitation } from "@/lib/organizations/invitations/queries";
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
import { Copy, Lock, Mail, RotateCw, UserPlus, X } from "lucide-react";
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

export function TeamMembersSection({
  members: initialMembers,
  invitations = [],
}: {
  members: TeamMemberRow[];
  invitations?: PendingInvitation[];
}) {
  const { t, formatDate } = useTranslation();
  const supabase = useSupabase();
  const router = useRouter();
  const { user } = useAuthUser();
  const { currentOrganizationId } = useCurrentOrganization();
  const [members, setMembers] = useState(initialMembers);

  const { role: myRole } = useOrganizationPermissions();

  // Hierarchy: you can only hand out roles below your own (owners: all but owner).
  const roleOptions = useMemo(
    () =>
      assignableRoles(myRole).map((r) => ({
        value: r,
        label: roleLabel(r, t),
      })),
    [myRole, t],
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

  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [invitationBusyId, setInvitationBusyId] = useState<string | null>(null);

  function inviteErrorMessage(code: string) {
    if (code === "already_member") return t("settings.team.alreadyMember");
    if (code === "forbidden" || code === "forbidden_role") return t("settings.team.lockedRoleHint");
    return t("settings.team.inviteFailed");
  }

  async function onAddMember(data: TeamMemberAddInput) {
    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
      );
      return;
    }

    if (!assignableRoles(myRole).includes(data.role)) {
      toast.error(t("settings.team.lockedRoleHint"));
      return;
    }

    setAddBusy(true);
    try {
      const result = await createInvitation({
        organizationId: orgId,
        email: data.email,
        role: data.role,
      });
      if (!result.ok) {
        toast.error(inviteErrorMessage(result.error));
        return;
      }
      setLastInviteUrl(result.emailed ? null : result.inviteUrl);
      if (result.emailed) toast.success(t("settings.team.inviteSent"));
      else toast.warning(t("settings.team.inviteNotEmailed"));
      addForm.reset({ email: "", role: "manager" });
      router.refresh();
    } finally {
      setAddBusy(false);
    }
  }

  async function copyInviteLink(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success(t("settings.team.inviteLinkCopied"));
  }

  async function onResend(invitation: PendingInvitation) {
    setInvitationBusyId(invitation.id);
    try {
      const result = await resendInvitation(invitation.id);
      if (!result.ok) {
        toast.error(inviteErrorMessage(result.error));
        return;
      }
      setLastInviteUrl(result.emailed ? null : result.inviteUrl);
      if (result.emailed) toast.success(t("settings.team.inviteResent"));
      else toast.warning(t("settings.team.inviteNotEmailed"));
      router.refresh();
    } finally {
      setInvitationBusyId(null);
    }
  }

  async function onRevoke(invitation: PendingInvitation) {
    setInvitationBusyId(invitation.id);
    try {
      const result = await revokeInvitation(invitation.id);
      if (!result.ok) {
        toast.error(inviteErrorMessage(result.error));
        return;
      }
      toast.success(t("settings.team.inviteRevoked"));
      router.refresh();
    } finally {
      setInvitationBusyId(null);
    }
  }

  async function onRoleChange(member: TeamMemberRow, nextRole: string) {
    if (!supabase || member.role === nextRole) return;

    if (
      !canChangeMemberRole(myRole, member.role) ||
      !assignableRoles(myRole).includes(nextRole as UserRole)
    ) {
      toast.error(t("settings.team.lockedRoleHint"));
      return;
    }

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

    if (!canRemoveMember(myRole, removeTarget.role)) {
      toast.error(t("settings.team.lockedRoleHint"));
      return;
    }

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
        <h2 className="font-heading text-lg font-bold">{t("settings.team.inviteTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("settings.team.inviteDescription")}
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
                className="h-12 min-h-12 w-full min-w-0 rounded-xl border border-foreground/25 md:flex-1"
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
              {t("settings.team.inviteButton")}
            </Button>
          </div>
          {addForm.formState.errors.email ? (
            <p className="text-sm text-destructive">
              {addForm.formState.errors.email.message}
            </p>
          ) : null}
        </div>
      </form>

      {lastInviteUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm">
          <p className="min-w-0 flex-1 break-all">{lastInviteUrl}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void copyInviteLink(lastInviteUrl)}>
            <Copy aria-hidden /> {t("settings.team.inviteCopyLink")}
          </Button>
        </div>
      ) : null}

      {invitations.length > 0 ? (
        <section className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
          <h2 className="border-b border-foreground/10 px-6 py-4 font-heading text-base font-bold">
            {t("settings.team.invitePendingTitle")}
          </h2>
          <ul className="divide-y divide-foreground/10">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{invitation.email}</p>
                  <p className="text-app-xs text-muted-foreground">
                    {roleLabel(invitation.role, t)} ·{" "}
                    {t("settings.team.inviteExpires", { date: formatDate(invitation.expiresAt) })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={invitationBusyId === invitation.id}
                  onClick={() => void onResend(invitation)}
                >
                  <RotateCw aria-hidden /> {t("settings.team.inviteResend")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={invitationBusyId === invitation.id}
                  onClick={() => void onRevoke(invitation)}
                >
                  <X aria-hidden /> {t("settings.team.inviteRevoke")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
            {members.map((m) => {
              const isSelf = m.userId === user?.id;
              const mayChangeRole = !isSelf && canChangeMemberRole(myRole, m.role);
              const mayRemove = !isSelf && canRemoveMember(myRole, m.role);
              return (
              <TableRow key={m.id}>
                <TableCell className={APP_TABLE_CELL_PRIMARY}>
                  {m.fullName?.trim() || "—"}
                  {isSelf ? (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-app-xs font-semibold text-muted-foreground">
                      {t("settings.team.you")}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="font-medium">{m.email ?? "—"}</TableCell>
                <TableCell>
                  {mayChangeRole ? (
                    <FormSelect
                      value={m.role}
                      onValueChange={(v) => void onRoleChange(m, v)}
                      disabled={roleBusyId === m.id}
                      options={roleOptions}
                      className="h-10 min-h-10 text-sm"
                    />
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 font-medium"
                      title={isSelf ? undefined : t("settings.team.lockedRoleHint")}
                    >
                      {!isSelf ? <Lock className="size-3.5 text-muted-foreground" aria-hidden /> : null}
                      {roleLabel(m.role, t)}
                    </span>
                  )}
                </TableCell>
                <TableCell className={APP_TABLE_CELL_DATE}>
                  {formatDate(m.createdAtIso)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={!mayRemove}
                    onClick={() => setRemoveTarget(m)}
                  >
                    {t("settings.team.remove")}
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <section className={cn("flex flex-col gap-4 p-6 md:p-8", RN_CARD_SHELL)}>
        <div>
          <h2 className="font-heading text-lg font-bold">{t("settings.team.rolesGuideTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("settings.team.rolesGuideDescription")}
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {USER_ROLES.map((r) => (
            <li
              key={r}
              className={cn(
                "rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10",
                r === myRole && "bg-success/8 ring-success/40",
              )}
            >
              <p className="flex items-center gap-2 font-heading font-semibold">
                {roleLabel(r, t)}
                {r === myRole ? (
                  <span className="rounded-full bg-success px-2 py-0.5 text-app-xs font-semibold !text-white">
                    {t("settings.team.yourRole")}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`settings.team.roleDesc.${r}`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

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
