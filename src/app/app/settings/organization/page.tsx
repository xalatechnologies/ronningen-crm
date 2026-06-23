import { OrganizationProfileForm } from "@/components/settings/organization-profile-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import type { OrganizationProfileRow } from "@/lib/organizations/organization-profile";
import { requireOrgAdminSettingsAccess } from "@/lib/settings/require-settings-access";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage() {
  const [supabase, { orgId }] = await Promise.all([
    getCachedServerSupabaseClient(),
    requireOrgAdminSettingsAccess(),
  ]);

  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, logo_url, legal_name, tagline, org_number, address_line1, address_line2, postal_code, city, contact_email, contact_phone, bank_account, payment_instructions",
    )
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) notFound();

  const organization = data as OrganizationProfileRow;

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title="Organisasjon"
        description={
          <>
            Virksomhetsinfo for{" "}
            <span className="font-medium text-foreground">{organization.name}</span>
            {" "}— brukes på fakturaer og i appen.
          </>
        }
      />
      <OrganizationProfileForm organization={organization} />
    </div>
  );
}
