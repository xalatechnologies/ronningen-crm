"use server";

import { deleteUserAccount } from "@/lib/auth/account-deletion";
import { getServerTranslation } from "@/i18n/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function deleteOwnAccount(confirmEmail: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const { t } = await getServerTranslation();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: t("serverErrors.auth.mustBeLoggedIn") };
  }

  return deleteUserAccount({
    userId: user.id,
    confirmEmail,
  });
}
