"use client";

import { Copy, Mail, RotateCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import type { PendingInvitation } from "@/lib/organizations/invitations/queries";
import { roleLabel } from "@/lib/navigation/nav-labels";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = {
  invitations: PendingInvitation[];
  busyInvitationId: string | null;
  /** Set when the e-mail could not be sent: the link to hand over by hand. */
  fallbackLink: string | null;
  onCopyLink: (url: string) => void;
  onResend: (invitation: PendingInvitation) => void;
  onRevoke: (invitation: PendingInvitation) => void;
};

export function PendingInvitations({ invitations, busyInvitationId, fallbackLink, onCopyLink, onResend, onRevoke }: Props) {
  const { t, formatDate } = useTranslation();

  return (
    <>
      {fallbackLink ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-status-warning-border bg-status-warning-bg px-5 py-4 text-app-sm text-status-warning-text"
        >
          <p className="min-w-0 flex-1 break-all">{fallbackLink}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onCopyLink(fallbackLink)}>
            <Copy aria-hidden /> {t("settings.team.inviteCopyLink")}
          </Button>
        </div>
      ) : null}

      {invitations.length > 0 ? (
        <section aria-labelledby="team-pending-title" className="flex flex-col gap-3">
          <h2 id="team-pending-title" className="flex items-center gap-2 font-heading text-lg font-bold">
            {t("settings.team.invitePendingTitle")}
            <span className="rounded-full bg-muted px-2 py-0.5 text-app-xs font-semibold text-muted-foreground">
              {invitations.length}
            </span>
          </h2>
          <ul className={cn(RN_CARD_SHELL, "divide-y divide-foreground/10 overflow-hidden")}>
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 md:px-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{invitation.email}</p>
                  <p className="text-app-xs text-muted-foreground">
                    {roleLabel(invitation.role, t)} · {t("settings.team.inviteExpires", { date: formatDate(invitation.expiresAt) })}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={busyInvitationId === invitation.id} onClick={() => onResend(invitation)}>
                  <RotateCw aria-hidden /> {t("settings.team.inviteResend")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={busyInvitationId === invitation.id}
                  onClick={() => onRevoke(invitation)}
                >
                  <X aria-hidden /> {t("settings.team.inviteRevoke")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
