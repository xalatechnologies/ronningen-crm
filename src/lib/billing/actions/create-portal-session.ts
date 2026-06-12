"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPortalSessionForOrganization } from "@/lib/billing/billing-service";

export async function createPortalSession(organizationId: string): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Du må være innlogget." };
  }

  return createPortalSessionForOrganization({
    organizationId,
    userId: user.id,
  });
}
