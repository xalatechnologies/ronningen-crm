import "server-only";

import { contractPublicOrigin } from "@/lib/contracts/mail";
import { brandedFromAddress, sendEmail } from "@/lib/notifications/email-client";
import type { Translator } from "@/i18n/types";
import { PORTAL_INVITE_TTL_DAYS } from "./rules";

export function portalInviteUrl(token: string): string {
  return `${contractPublicOrigin()}/portal/invite/${token}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPortalInviteEmail(input: {
  to: string;
  token: string;
  accountId: string;
  organizationName: string;
  customerName: string;
  t: Translator;
}) {
  const { t } = input;
  const url = portalInviteUrl(input.token);
  const body = t("portal.mail.body", { name: input.customerName, org: input.organizationName });
  const cta = t("portal.mail.cta");
  const footer = t("portal.mail.footer", { days: PORTAL_INVITE_TTL_DAYS });

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
    subject: t("portal.mail.subject", { org: input.organizationName }),
    html,
    text: `${body}\n\n${cta}: ${url}\n\n${footer}`,
    idempotencyKey: `portal-invite:${input.accountId}:${input.token.slice(0, 8)}`,
  });
}

export async function sendPortalMessageEmail(input: {
  to: string;
  accountId: string;
  organizationName: string;
  customerName: string;
  kind?: "message" | "wishlist" | "schedule";
  t: Translator;
}) {
  const { t } = input;
  const kind = input.kind ?? "message";
  const path = { message: "messages", wishlist: "wishlist", schedule: "schedule" }[kind];
  const url = `${contractPublicOrigin()}/portal/${path}`;
  const copy = { message: "portal.mailMessage", wishlist: "portal.mailWish", schedule: "portal.mailSchedule" }[kind];
  const body = t(`${copy}.body` as "portal.mailMessage.body", { name: input.customerName, org: input.organizationName });
  const cta = t(`${copy}.cta` as "portal.mailMessage.cta");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:24px 12px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px 28px;color:#1c1917;">
      <tr><td style="font-size:16px;line-height:1.6;">
        <p style="margin:0 0 16px;">${escapeHtml(body)}</p>
        <p style="margin:24px 0 0;"><a href="${url}" style="display:inline-block;background:#1a4331;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:600;">${escapeHtml(cta)}</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  // The message text is deliberately not in the e-mail: it stays inside the portal.
  return sendEmail({
    to: input.to,
    from: brandedFromAddress(input.organizationName),
    subject: t(`${copy}.subject` as "portal.mailMessage.subject", { org: input.organizationName }),
    html,
    text: `${body}\n\n${cta}: ${url}`,
    idempotencyKey: `portal-${kind}:${input.accountId}:${Math.floor(Date.now() / (15 * 60_000))}`,
  });
}
