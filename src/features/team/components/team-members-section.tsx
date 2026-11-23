"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import type { UserRole } from "@/constants/roles";
import { InviteForm } from "@/features/team/components/invite-form";
import { MemberList } from "@/features/team/components/member-list";
import { PendingInvitations } from "@/features/team/components/pending-invitations";
import { RolesGuide } from "@/features/team/components/roles-guide";
import { memberDisplayName, removeError, roleChangeError, type TeamMemberRow } from "@/features/team/lib/member-rules";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
import { useTranslation } from "@/i18n/client";
import { createInvitation, resendInvitation, revokeInvitation } from "@/lib/organizations/invitations/actions";
import type { PendingInvitation } from "@/lib/organizations/invitations/queries";
import { roleLabel } from "@/lib/navigation/nav-labels";
import { assignableRoles } from "@/lib/organizations/organization-permissions";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import type { TeamMemberAddInput } from "@/lib/validations";
import { useSupabase } from "@/providers/supabase-provider";

export function TeamMembersSection({
  members: initialMembers,
  invitations = [],
}: {
  members: TeamMemberRow[];
  invitations?: PendingInvitation[];
}) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const router = useRouter();
  const { user } = useAuthUser();
  const { currentOrganizationId } = useCurrentOrganization();
  const { role: myRole } = useOrganizationPermissions();
  const [members, setMembers] = useState(initialMembers);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberRow | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const [invitationBusyId, setInvitationBusyId] = useState<string | null>(null);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  // Hierarchy: you can only hand out roles below your own (owners: all but owner).
  const roleOptions = useMemo(
    () => assignableRoles(myRole).map((r) => ({ value: r, label: roleLabel(r, t) })),
    [myRole, t],
  );
  const ownerCount = useMemo(() => members.filter((m) => m.role === "owner").length, [members]);

  function inviteErrorMessage(code: string) {
    if (code === "already_member") return t("settings.team.alreadyMember");
    if (code === "forbidden" || code === "forbidden_role") return t("settings.team.lockedRoleHint");
    return t("settings.team.inviteFailed");
  }

  function guardMessage(code: "locked" | "last_owner" | "self", lastOwnerKey: "settings.team.minOwner" | "settings.team.cannotRemoveLastOwner") {
    if (code === "last_owner") return t(lastOwnerKey);
    if (code === "self") return t("settings.team.cannotRemoveSelf");
    return t("settings.team.lockedRoleHint");
  }

  async function onInvite(data: TeamMemberAddInput): Promise<boolean> {
    let organizationId: string;
    try {
      organizationId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.toasts.noActiveOrg"));
      return false;
    }
    if (!assignableRoles(myRole).includes(data.role)) {
      toast.error(t("settings.team.lockedRoleHint"));
      return false;
    }
    const result = await createInvitation({ organizationId, email: data.email, role: data.role });
    if (!result.ok) {
      toast.error(inviteErrorMessage(result.error));
      return false;
    }
    setFallbackLink(result.emailed ? null : result.inviteUrl);
    if (result.emailed) toast.success(t("settings.team.inviteSent"));
    else toast.warning(t("settings.team.inviteNotEmailed"));
    router.refresh();
    return true;
  }

  async function copyInviteLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("settings.team.inviteLinkCopied"));
    } catch {
      toast.error(t("settings.team.inviteCopyFailed"));
    }
  }

  async function onResend(invitation: PendingInvitation) {
    setInvitationBusyId(invitation.id);
    try {
      const result = await resendInvitation(invitation.id);
      if (!result.ok) {
        toast.error(inviteErrorMessage(result.error));
        return;
      }
      setFallbackLink(result.emailed ? null : result.inviteUrl);
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
    const refusal = roleChangeError(myRole, member, nextRole as UserRole, ownerCount);
    if (refusal) {
      toast.error(
        refusal === "last_owner" ? t("settings.team.cannotChangeRole") : t("settings.team.lockedRoleHint"),
        refusal === "last_owner" ? { description: t("settings.team.minOwner") } : undefined,
      );
      return;
    }
    setRoleBusyId(member.id);
    try {
      const { error } = await supabase.from("organization_members").update({ role: nextRole }).eq("id", member.id);
      if (error) {
        toast.error(t("settings.team.updateRoleFailed"), { description: error.message });
        return;
      }
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: nextRole as UserRole } : m)));
      toast.success(t("settings.team.roleUpdated"));
      router.refresh();
    } finally {
      setRoleBusyId(null);
    }
  }

  async function confirmRemoveMember() {
    if (!supabase || !removeTarget) return;
    const refusal = removeError(myRole, removeTarget, ownerCount, removeTarget.userId === user?.id);
    if (refusal) {
      toast.error(guardMessage(refusal, "settings.team.cannotRemoveLastOwner"));
      return;
    }
    setRemoveBusy(true);
    try {
      const { error } = await supabase.from("organization_members").delete().eq("id", removeTarget.id);
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
      <InviteForm roleOptions={roleOptions} onInvite={onInvite} />
      <MemberList
        members={members}
        myRole={myRole}
        myUserId={user?.id ?? null}
        roleOptions={roleOptions}
        busyMemberId={roleBusyId}
        onRoleChange={(m, next) => void onRoleChange(m, next)}
        onRemove={setRemoveTarget}
      />
      <PendingInvitations
        invitations={invitations}
        busyInvitationId={invitationBusyId}
        fallbackLink={fallbackLink}
        onCopyLink={(url) => void copyInviteLink(url)}
        onResend={(i) => void onResend(i)}
        onRevoke={(i) => void onRevoke(i)}
      />
      <RolesGuide myRole={myRole} />
      <ConfirmDeleteDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={t("settings.team.removeTitle")}
        description={
          removeTarget
            ? t("settings.team.removeDescription", { name: memberDisplayName(removeTarget, t("settings.team.memberFallback")) })
            : null
        }
        confirmLabel={t("settings.team.removeConfirm")}
        busy={removeBusy}
        onConfirm={confirmRemoveMember}
      />
    </div>
  );
}
