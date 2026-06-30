"use server";

import { deleteUserAccount } from "@/lib/auth/account-deletion";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function deleteOwnAccount(confirmEmail: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Du må være innlogget." };
  }

  return deleteUserAccount({
    userId: user.id,
    confirmEmail,
  });
}
