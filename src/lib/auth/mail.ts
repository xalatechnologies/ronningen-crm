import { APP_NAME } from "@/config/app";
import { sendEmail } from "@/lib/notifications/email-client";
import type { Translator } from "@/i18n/types";
import { LOGIN_CODE_TTL_MINUTES } from "./login-codes";

export async function sendLoginCodeEmail(input: { to: string; code: string; t: Translator }) {
  const { t } = input;
  const body = t("auth.otp.emailBody", { appName: APP_NAME });
  const footer = t("auth.otp.emailFooter", { minutes: LOGIN_CODE_TTL_MINUTES });
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:24px 12px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px 28px;color:#1c1917;">
      <tr><td style="font-size:16px;line-height:1.6;">
        <p style="margin:0 0 16px;">${body}</p>
        <p style="margin:20px 0;font-size:34px;font-weight:700;letter-spacing:8px;color:#1a4331;">${input.code}</p>
        <p style="margin:0;font-size:13px;color:#57534e;">${footer}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return sendEmail({
    to: input.to,
    subject: t("auth.otp.emailSubject", { appName: APP_NAME }),
    html,
    text: `${body}\n\n${input.code}\n\n${footer}`,
  });
}
