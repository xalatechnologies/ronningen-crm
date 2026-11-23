import "server-only";

import { toInvoiceRows, type InvoiceRow } from "@/features/billing/lib/invoice-history";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { assertBillingConfigured } from "@/lib/billing/billing-env";
import { isBillingEnabled } from "@/lib/billing/constants";
import { requireOrganizationOwner } from "@/lib/billing/require-organization-owner";
import { getStripeClient } from "@/lib/billing/stripe";
import { getServerT } from "@/lib/i18n/server-messages";

const MAX_INVOICES = 24;

export type InvoiceHistoryResult = { ok: true; invoices: InvoiceRow[] } | { ok: false; error: string };

/**
 * Invoices Stripe has sent to this organization's own Stripe customer. Only the organization's owner may read
 * them, and the customer id always comes from our database row for that organization, never from the request.
 */
export async function listInvoicesForOrganization(organizationId: string, userId: string): Promise<InvoiceHistoryResult> {
  const t = await getServerT();
  if (!isBillingEnabled()) return { ok: false, error: t("serverErrors.billing.billingNotEnabled") };

  const billingCheck = assertBillingConfigured();
  if (!billingCheck.ok) return { ok: false, error: billingCheck.error };

  const ownerResult = await requireOrganizationOwner(organizationId);
  if (!ownerResult.ok) return ownerResult;
  if (ownerResult.owner.userId !== userId) return { ok: false, error: t("serverErrors.billing.ownerOnly") };

  const admin = createSupabaseAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!subscription?.provider_customer_id) return { ok: false, error: t("serverErrors.billing.noStripeCustomer") };

  try {
    const list = await getStripeClient().invoices.list({ customer: subscription.provider_customer_id, limit: MAX_INVOICES });
    return { ok: true, invoices: toInvoiceRows(list.data) };
  } catch {
    return { ok: false, error: t("serverErrors.billing.invoicesFailed") };
  }
}
