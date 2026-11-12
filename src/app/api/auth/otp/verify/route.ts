import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getServerTranslation } from "@/i18n/server";
import { mapAuthErrorToUserMessage } from "@/lib/auth/auth-error-messages";
import { consumeLoginCode } from "@/lib/auth/login-codes";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { setRememberCookie } from "@/lib/auth/remember";
import { resolvePostAuthRedirect } from "@/lib/organizations/tenant-setup-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().min(3).max(254),
  code: z.string().regex(/^\d{6}$/),
  remember: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { t, locale } = await getServerTranslation();
  const invalid = NextResponse.json({ error: t("auth.otp.invalid") }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid;
  const email = normalizeEmail(parsed.data.email);

  if (!(await consumeLoginCode(email, parsed.data.code))) return invalid;

  // The code proved control of the mailbox: mint a one-time sign-in token and exchange it for a session.
  const admin = createSupabaseAdminClient();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return invalid;

  const remember = parsed.data.remember !== false;
  const supabase = await createServerSupabaseClient({ remember });
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error || !data.user) {
    return NextResponse.json({ error: mapAuthErrorToUserMessage(error ?? {}, locale) }, { status: 401 });
  }

  await setRememberCookie(remember);
  const redirectTo = await resolvePostAuthRedirect(supabase, data.user.id);
  return NextResponse.json({ ok: true, redirectTo });
}
