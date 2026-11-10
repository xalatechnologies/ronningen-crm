"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCheckoutSessionForOrganization } from "@/lib/billing/billing-service";
import { getServerTranslation } from "@/i18n/server";

export async function createCheckoutSession(organizationId: string): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string }
> {
  const { t } = await getServerTranslation();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: t("serverErrors.auth.mustBeLoggedIn") };
  }

  return createCheckoutSessionForOrganization({
    organizationId,
    userId: user.id,
  });
}
