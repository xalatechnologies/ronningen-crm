import "server-only";

import { contractPublicOrigin } from "@/lib/contracts/mail";
import { brandedFromAddress, sendEmail, type SendEmailResult } from "@/lib/notifications/email-client";
import type { Translator } from "@/i18n/types";
import { PALETTES, type PaletteKey } from "./invite-rules";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Display names go into headers: strip anything that could break one and bound the length. */
export function safeName(value: string, max = 80): string {
  return value.replace(/[\r\n<>"]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function guestInviteUrl(token: string): string {
  return `${contractPublicOrigin()}/i/${token}`;
}

/**
 * The guest e-mail. The subject is a fixed pattern around the host's name (never free text), the body is
 * a plain branded card with one button, and every user-supplied string is escaped.
 */
export async function sendGuestInviteEmail(input: {
  to: string;
  token: string;
  guestId: string;
  kind: "invite" | "reminder";
  sendCount: number;
  guestName: string;
  hostName: string;
  hostEmail: string | null;
  venueName: string;
  headline: string;
  dateText: string;
  placeText: string;
  paletteKey: PaletteKey;
  t: Translator;
}): Promise<SendEmailResult> {
  const { t } = input;
  const p = PALETTES[input.paletteKey];
  const host = safeName(input.hostName) || input.venueName;
  const url = guestInviteUrl(input.token);
  const intro = input.kind === "invite" ? t("portal.guestMail.inviteIntro", { host }) : t("portal.guestMail.reminderIntro", { host });
  const cta = t("portal.guestMail.cta");
  const footer = t("portal.guestMail.footer", { host });
  const lines = [input.dateText, input.placeText].filter((l) => l.trim() !== "");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:24px 12px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;color:#1c1917;">
      <tr><td style="background:${p.bg};padding:32px 28px;text-align:center;">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${p.accent};font-weight:700;">${escapeHtml(t("portal.invitation.cardInvited"))}</p>
        <p style="margin:0;font-size:26px;line-height:1.2;color:${p.ink};font-family:Georgia,serif;">${escapeHtml(input.headline)}</p>
        ${lines.map((l) => `<p style="margin:10px 0 0;font-size:15px;color:${p.muted};">${escapeHtml(l)}</p>`).join("")}
      </td></tr>
      <tr><td style="padding:28px;font-size:16px;line-height:1.6;">
        <p style="margin:0 0 6px;">${escapeHtml(t("portal.guestMail.hello", { name: safeName(input.guestName) }))}</p>
        <p style="margin:0 0 20px;">${escapeHtml(intro)}</p>
        <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#1a4331;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">${escapeHtml(cta)}</a></p>
        <p style="margin:0;font-size:12px;color:#57534e;">${escapeHtml(footer)}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const subject =
    input.kind === "invite"
      ? t("portal.guestMail.subjectInvite", { host })
      : t("portal.guestMail.subjectReminder", { host });

  return sendEmail({
    to: input.to,
    from: brandedFromAddress(`${host} via ${input.venueName}`),
    replyTo: input.hostEmail ?? undefined,
    subject,
    html,
    text: `${intro}\n\n${cta}: ${url}\n\n${footer}`,
    idempotencyKey: `guest-${input.kind}:${input.guestId}:${input.sendCount}`,
  });
}
