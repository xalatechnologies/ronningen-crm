import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { safeInternalRedirect } from "@/lib/security/safe-redirect";
import { getSupabasePublicEnvForClient } from "@/lib/supabase/public-env";
import { getServerTranslation } from "@/i18n/server";

export async function GET(request: NextRequest) {
  const { t } = await getServerTranslation();
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeInternalRedirect(
    searchParams.get("next") ?? undefined,
    "/app",
  );

  const redirectTo = new URL(next, origin);

  if (!tokenHash || !type) {
    redirectTo.pathname = "/auth/login";
    redirectTo.searchParams.set(
      "error",
      t("serverErrors.auth.confirmLinkInvalid"),
    );
    return NextResponse.redirect(redirectTo);
  }

  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicEnvForClient();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    redirectTo.pathname = "/auth/login";
    redirectTo.searchParams.set(
      "error",
      t("serverErrors.auth.confirmLinkInvalid"),
    );
    return NextResponse.redirect(redirectTo);
  }

  return NextResponse.redirect(redirectTo);
}
