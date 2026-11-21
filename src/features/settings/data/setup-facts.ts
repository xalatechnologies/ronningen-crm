import type { SetupFacts } from "@/features/settings/lib/setup-progress";
import type { TenantSupabaseClient } from "@/lib/queries/types";

type OrganizationRow = {
  org_number: string | null;
  address_line1: string | null;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  subscription_status: string | null;
  billing_exempt: boolean | null;
  portal_enabled?: boolean | null;
};

/**
 * Reads the facts the setup checklist needs. Every read is filtered by the organization id (and runs with the
 * signed-in user's access rules). The calendar feed is owner-only, so the caller checks it and passes the answer.
 */
export async function fetchSetupFacts(
  supabase: TenantSupabaseClient,
  organizationId: string,
  extra: { hasCalendarFeed: boolean },
): Promise<SetupFacts> {
  const [orgRes, propertyRes, memberRes, templateRes] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "org_number, address_line1, city, contact_email, contact_phone, logo_url, subscription_status, billing_exempt, portal_enabled" as "id",
      )
      .eq("id", organizationId)
      .maybeSingle(),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase
      .from("contract_templates" as never)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  const org = (orgRes.data ?? null) as unknown as OrganizationRow | null;
  return {
    profile: {
      org_number: org?.org_number ?? null,
      address_line1: org?.address_line1 ?? null,
      city: org?.city ?? null,
      contact_email: org?.contact_email ?? null,
      contact_phone: org?.contact_phone ?? null,
    },
    propertyCount: propertyRes.count ?? 0,
    memberCount: memberRes.count ?? 0,
    hasContractTemplate: (templateRes.count ?? 0) > 0,
    subscriptionStatus: org?.subscription_status ?? "",
    billingExempt: Boolean(org?.billing_exempt),
    hasCalendarFeed: extra.hasCalendarFeed,
    portalEnabled: Boolean(org?.portal_enabled),
    hasLogo: Boolean(org?.logo_url?.trim()),
  };
}
