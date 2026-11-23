"use client";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { UserRole } from "@/constants/roles";
import { memberActions, memberDisplayName, type TeamMemberRow } from "@/features/team/lib/member-rules";
import { useTranslation } from "@/i18n/client";
import { roleLabel } from "@/lib/navigation/nav-labels";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = {
  members: TeamMemberRow[];
  myRole: UserRole | null;
  myUserId: string | null;
  roleOptions: Array<{ value: string; label: string }>;
  busyMemberId: string | null;
  onRoleChange: (member: TeamMemberRow, nextRole: string) => void;
  onRemove: (member: TeamMemberRow) => void;
};

/** One person per row: avatar, name and email, role (editable or locked), member since, remove. */
export function MemberList({ members, myRole, myUserId, roleOptions, busyMemberId, onRoleChange, onRemove }: Props) {
  const { t, formatDate } = useTranslation();

  return (
    <section aria-labelledby="team-members-title" className="flex flex-col gap-3">
      <h2 id="team-members-title" className="flex items-center gap-2 font-heading text-lg font-bold">
        {t("settings.team.membersTitle")}
        <span className="rounded-full bg-muted px-2 py-0.5 text-app-xs font-semibold text-muted-foreground">
          {members.length}
        </span>
      </h2>
      <ul className={cn(RN_CARD_SHELL, "divide-y divide-foreground/10 overflow-hidden")}>
        {members.map((m) => {
          const isSelf = m.userId === myUserId;
          const { mayChangeRole, mayRemove } = memberActions(myRole, m, isSelf);
          const name = memberDisplayName(m, t("settings.team.memberFallback"));
          return (
            <li key={m.id} className="grid gap-x-4 gap-y-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_12rem_8rem_5rem] md:items-center md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <InitialsAvatar name={name} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <span className="truncate">{name}</span>
                    {isSelf ? (
                      <StatusBadge tone="info" dot={false}>
                        {t("settings.team.you")}
                      </StatusBadge>
                    ) : null}
                  </p>
                  {m.email && m.email !== name ? (
                    <p className="truncate text-app-sm text-muted-foreground">{m.email}</p>
                  ) : null}
                </div>
              </div>
              <div>
                {mayChangeRole ? (
                  <FormSelect
                    value={m.role}
                    onValueChange={(v) => onRoleChange(m, v)}
                    disabled={busyMemberId === m.id}
                    options={roleOptions}
                    aria-label={t("settings.team.roleFor", { name })}
                    className="h-10 min-h-10 w-full text-sm"
                  />
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 text-app-sm font-medium"
                    title={isSelf ? undefined : t("settings.team.lockedRoleHint")}
                  >
                    {!isSelf ? <Lock className="size-3.5 text-muted-foreground" aria-hidden /> : null}
                    {roleLabel(m.role, t)}
                  </span>
                )}
              </div>
              <p className="text-app-sm text-muted-foreground md:text-left">
                <span className="md:sr-only">{t("settings.team.tableMemberSince")}: </span>
                {formatDate(m.createdAtIso)}
              </p>
              <div className="md:text-right">
                {mayRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={t("settings.team.removeAria", { name })}
                    onClick={() => onRemove(m)}
                  >
                    {t("settings.team.remove")}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
