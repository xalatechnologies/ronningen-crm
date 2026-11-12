import { contractPublicOrigin } from "@/lib/contracts/mail";
import { brandedFromAddress, sendEmail } from "@/lib/notifications/email-client";
import type { Translator } from "@/i18n/types";
import { INVITATION_TTL_DAYS } from "./rules";

export function invitationUrl(token: string): string {
  return `${contractPublicOrigin()}/auth/invite/${token}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendInvitationEmail(input: {
  to: string;
  token: string;
  invitationId: string;
  organizationName: string;
  inviterName: string;
  roleLabel: string;
  t: Translator;
}) {
  const { t } = input;
  const url = invitationUrl(input.token);
  const body = t("settings.team.inviteEmailBody", {
    inviter: input.inviterName,
    org: input.organizationName,
    role: input.roleLabel,
  });
  const footer = t("settings.team.inviteEmailFooter", { days: INVITATION_TTL_DAYS });
  const cta = t("settings.team.inviteEmailCta");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:24px 12px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px 28px;color:#1c1917;">
      <tr><td style="font-size:16px;line-height:1.6;">
        <p style="margin:0 0 16px;">${escapeHtml(body)}</p>
        <p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#1a4331;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:600;">${escapeHtml(cta)}</a></p>
        <p style="margin:0;font-size:13px;color:#57534e;">${escapeHtml(footer)}<br />${escapeHtml(url)}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return sendEmail({
    to: input.to,
    from: brandedFromAddress(input.organizationName),
    subject: t("settings.team.inviteEmailSubject", { org: input.organizationName }),
    html,
    text: `${body}\n\n${cta}: ${url}\n\n${footer}`,
    idempotencyKey: `team-invite:${input.invitationId}:${input.to}`,
  });
}
