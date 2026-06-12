"use server";

import { sendWelcomeNotification } from "@/lib/notifications/send-platform-notification";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function triggerWelcomeNotification(input: {
  organizationName: string;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Ikke innlogget" };
  }

  const result = await sendWelcomeNotification({
    userId: user.id,
    organizationName: input.organizationName,
  });

  if (!result.ok && !result.skipped) {
    return { ok: false as const, error: result.error ?? "Kunne ikke sende velkomst-e-post" };
  }

  return { ok: true as const, skipped: result.skipped };
}
