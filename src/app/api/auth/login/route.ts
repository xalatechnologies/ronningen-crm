import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerTranslation } from "@/i18n/server";
import { mapAuthErrorToUserMessage } from "@/lib/auth/auth-error-messages";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { setRememberCookie } from "@/lib/auth/remember";
import { resolvePostAuthRedirect } from "@/lib/organizations/tenant-setup-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(500),
  remember: z.boolean().optional(),
});

/** Password login in one server round trip: sign in, set the session lifetime, resolve the landing page. */
export async function POST(request: Request) {
  const { t, locale } = await getServerTranslation();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: t("serverErrors.auth.invalidRequest") }, { status: 400 });
  }

  const remember = parsed.data.remember !== false;
  const supabase = await createServerSupabaseClient({ remember });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(parsed.data.email),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: mapAuthErrorToUserMessage(error ?? {}, locale) },
      { status: error?.status === 429 ? 429 : 401 },
    );
  }

  await setRememberCookie(remember);
  const redirectTo = await resolvePostAuthRedirect(supabase, data.user.id);
  return NextResponse.json({ ok: true, redirectTo });
}
