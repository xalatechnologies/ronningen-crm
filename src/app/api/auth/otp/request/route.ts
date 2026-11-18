import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerTranslation } from "@/i18n/server";
import { sendLoginCodeEmail } from "@/lib/auth/mail";
import { issueLoginCode } from "@/lib/auth/login-codes";
import { allowLoginCodeIp } from "@/lib/auth/login-code-ip";
import { normalizeEmail } from "@/lib/auth/normalize-email";

export const runtime = "nodejs";

/** Always answers {ok:true} for a well-formed e-mail, so it never reveals whether an account exists. */
export async function POST(request: Request) {
  const { t } = await getServerTranslation();
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(body?.email ?? "");
  if (!z.string().email().safeParse(email).success) {
    return NextResponse.json({ error: t("serverErrors.auth.invalidRequest") }, { status: 400 });
  }

  // Over the per-IP limit: answer the same, send nothing.
  if (!(await allowLoginCodeIp(request, "request"))) return NextResponse.json({ ok: true });

  try {
    const code = await issueLoginCode(email);
    if (code) await sendLoginCodeEmail({ to: email, code, t });
  } catch (error) {
    console.error("[auth/otp/request]", error);
  }
  return NextResponse.json({ ok: true });
}
