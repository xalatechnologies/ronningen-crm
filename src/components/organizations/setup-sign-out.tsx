"use client";

import { useTranslation } from "@/i18n/client";
import { signOutToLogin } from "@/lib/auth/sign-out";
import { useSupabase } from "@/providers/supabase-provider";

/** Way out of the setup for someone who signed up with the wrong account. */
export function SetupSignOut() {
  const { t } = useTranslation();
  const supabase = useSupabase();

  return (
    <p className="text-center text-app-sm text-muted-foreground">
      {t("appPages.onboarding.wrongAccount")}{" "}
      <button
        type="button"
        onClick={() => void signOutToLogin(supabase)}
        className="font-semibold text-success underline decoration-success/40 underline-offset-4 transition-colors hover:text-success/90"
      >
        {t("appPages.onboarding.logout")}
      </button>
    </p>
  );
}
