import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerTranslation } from "@/i18n/server";
import { allowLoginCodeIp } from "@/lib/auth/login-code-ip";
import { emailHasAccount, issueSignupCode } from "@/lib/auth/login-codes";
import { sendLoginCodeEmail } from "@/lib/auth/mail";
import { normalizeEmail } from "@/lib/auth/normalize-email";

export const runtime = "nodejs";

/**
 * Step 1 of signup: e-mails a 6-digit code to prove the mailbox is real and the user's own.
 * No account exists yet. An e-mail that already has an account is rejected right away with a clear message.
 */
export async function POST(request: Request) {
  const { t } = await getServerTranslation();
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(body?.email ?? "");
  if (!z.string().email().max(254).safeParse(email).success) {
    return NextResponse.json({ error: t("serverErrors.auth.invalidRequest") }, { status: 400 });
  }

  if (!(await allowLoginCodeIp(request, "request"))) {
    return NextResponse.json({ error: t("auth.otp.tooMany") }, { status: 429 });
  }

  try {
    if (await emailHasAccount(email)) {
      return NextResponse.json({ error: t("serverErrors.auth.emailAlreadyRegistered"), exists: true }, { status: 409 });
    }
    const code = await issueSignupCode(email);
    if (!code) return NextResponse.json({ error: t("auth.otp.tooMany") }, { status: 429 });
    const sent = await sendLoginCodeEmail({ to: email, code, t, purpose: "signup" });
    if (!sent.ok) {
      console.error("[auth/register/code] e-mail not sent");
      return NextResponse.json({ error: t("auth.pages.signupCode.sendFailed") }, { status: 503 });
    }
  } catch (error) {
    console.error("[auth/register/code]", error);
    return NextResponse.json({ error: t("auth.pages.signupCode.sendFailed") }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
