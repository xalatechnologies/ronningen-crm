import type { SetupFacts } from "@/features/setup-checklist/lib/setup-checklist";
import type { TenantSupabaseClient } from "@/lib/queries/types";

type CountQuery = PromiseLike<{ count: number | null; error: unknown }> & {
  eq(column: string, value: unknown): CountQuery;
};

/** A head-only count of one tenant table. A failed count reads as 0, so a missing right never shows as progress. */
async function countRows(client: TenantSupabaseClient, table: string, organizationId: string, activeOnly = false): Promise<number> {
  // The table name is a plain string here, so the generated per-table types do not apply; the call is the same.
  const rows = client.from(table as never) as unknown as { select: (columns: string, options: object) => CountQuery };
  let query = rows.select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
  if (activeOnly) query = query.eq("active", true);
  const { count, error } = await query;
  return error ? 0 : (count ?? 0);
}

/**
 * Reads what the organization has done so far for the getting-started checklist.
 * Every read is limited to the one organization. Returns null when the organization itself cannot be read.
 */
export async function fetchSetupFacts(client: TenantSupabaseClient, organizationId: string): Promise<SetupFacts | null> {
  const [org, propertyCount, packages, services, memberCount, invitationCount, inquiryCount, bookingCount, subscription] = await Promise.all([
    client
      .from("organizations")
      .select("org_number, address_line1, city, contact_email, contact_phone, bank_account, payment_instructions")
      .eq("id", organizationId)
      .maybeSingle(),
    countRows(client, "properties", organizationId),
    countRows(client, "packages", organizationId, true),
    countRows(client, "services", organizationId, true),
    countRows(client, "organization_members", organizationId),
    countRows(client, "organization_invitations", organizationId),
    countRows(client, "booking_inquiries", organizationId),
    countRows(client, "bookings", organizationId),
    client
      .from("subscriptions")
      .select("provider_subscription_id")
      .eq("organization_id", organizationId)
      .not("provider_subscription_id", "is", null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (org.error || !org.data) return null;

  return {
    profile: org.data,
    propertyCount,
    priceCount: packages + services,
    memberCount,
    invitationCount,
    inquiryCount,
    bookingCount,
    hasSubscription: Boolean(subscription.data?.provider_subscription_id),
  };
}
