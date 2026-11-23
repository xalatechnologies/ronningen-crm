"use server";

import { listInvoicesForOrganization, type InvoiceHistoryResult } from "@/features/billing/data/invoices";
import { getServerTranslation } from "@/i18n/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listInvoices(organizationId: string): Promise<InvoiceHistoryResult> {
  const { t } = await getServerTranslation();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: t("serverErrors.auth.mustBeLoggedIn") };
  return listInvoicesForOrganization(organizationId, user.id);
}
