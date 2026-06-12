"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCheckoutSessionForOrganization } from "@/lib/billing/billing-service";

export async function createCheckoutSession(organizationId: string): Promise<
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

  return createCheckoutSessionForOrganization({
    organizationId,
    userId: user.id,
  });
}
