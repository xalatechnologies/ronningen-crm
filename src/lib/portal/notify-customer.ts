import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getServerTranslation } from "@/i18n/server";
import { sendPortalMessageEmail } from "./mail";
import { shouldEmailCustomer } from "./messages-rules";

/**
 * Tells the customer the venue answered (message or wishlist). One e-mail per booking per 15 minutes,
 * shared across kinds, so a busy venue never spams. Content stays inside the portal.
 */
export async function emailCustomerThrottled(input: {
  organizationId: string;
  bookingId: string;
  kind: "message" | "wishlist" | "schedule";
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("portal_accounts" as never)
    .select("id, email, customer_id, last_customer_emailed_at")
    .eq("booking_id", input.bookingId)
    .eq("organization_id", input.organizationId)
    .is("revoked_at", null)
    .not("accepted_at", "is", null)
    .maybeSingle();
  const account = data as unknown as {
    id: string;
    email: string;
    customer_id: string;
    last_customer_emailed_at: string | null;
  } | null;
  if (!account || !shouldEmailCustomer(account.last_customer_emailed_at)) return;

  const [{ data: org }, { data: customer }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", input.organizationId).maybeSingle(),
    admin.from("customers").select("name").eq("id", account.customer_id).maybeSingle(),
  ]);
  const { t } = await getServerTranslation();
  const sent = await sendPortalMessageEmail({
    to: account.email,
    accountId: account.id,
    organizationName: org?.name ?? "",
    customerName: customer?.name ?? "",
    kind: input.kind,
    t,
  });
  if (sent.ok) {
    await admin
      .from("portal_accounts" as never)
      .update({ last_customer_emailed_at: new Date().toISOString() } as never)
      .eq("id", account.id);
  }
}
