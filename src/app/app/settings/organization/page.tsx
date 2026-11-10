import { OrganizationProfileForm } from "@/components/settings/organization-profile-form";
import { TenantSetupBanner } from "@/components/settings/tenant-setup-banner";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { getServerTranslation } from "@/i18n/server";
import type { OrganizationProfileRow } from "@/lib/organizations/organization-profile";
import { fetchTenantSetupStatus } from "@/lib/organizations/tenant-setup-queries";
import { requireOrgAdminSettingsAccess } from "@/lib/settings/require-settings-access";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage() {
  const { t } = await getServerTranslation();
  const [supabase, { orgId, role }] = await Promise.all([
    getCachedServerSupabaseClient(),
    requireOrgAdminSettingsAccess(),
  ]);

  const [{ data, error }, setup] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, slug, logo_url, legal_name, tagline, org_number, address_line1, address_line2, postal_code, city, contact_email, contact_phone, bank_account, payment_instructions",
      )
      .eq("id", orgId)
      .maybeSingle(),
    fetchTenantSetupStatus(supabase, orgId, role),
  ]);

  if (error || !data) notFound();

  const organization = data as OrganizationProfileRow;
  const setupMode = setup.step === "organization";

  return (
    <div className="flex flex-col gap-6">
      {setupMode ? <TenantSetupBanner step="organization" /> : null}
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("appPages.settings.organization.title")}
        description={t("appPages.settings.organization.description", {
          name: organization.name,
        })}
      />
      <OrganizationProfileForm organization={organization} setupMode={setupMode} />
    </div>
  );
}
