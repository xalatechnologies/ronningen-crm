import { OrganizationProfileForm } from "@/components/settings/organization-profile-form";
import type { OrganizationProfileRow } from "@/lib/organizations/organization-profile";
import { requireOrgAdminSettingsAccess } from "@/lib/settings/require-settings-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { orgId } = await requireOrgAdminSettingsAccess(supabase);

  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, logo_url, legal_name, tagline, org_number, address_line1, address_line2, postal_code, city, contact_email, contact_phone, bank_account, payment_instructions",
    )
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="app-title">Organisasjon</h1>
        <p className="mt-2 text-app-base text-muted-foreground">
          Virksomhetsinfo som vises på fakturaer og i appen.
        </p>
      </div>
      <OrganizationProfileForm organization={data as OrganizationProfileRow} />
    </div>
  );
}
