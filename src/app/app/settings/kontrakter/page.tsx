import { FileText } from "lucide-react";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { ContractSettingsForm } from "@/components/contracts/contract-settings-form";
import { getServerTranslation } from "@/i18n/server";
import { contractFrom } from "@/lib/contracts/db";
import { requireOrgAdminSettingsAccess } from "@/lib/settings/require-settings-access";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { isEmailConfigured } from "@/lib/notifications/email-client";

export const dynamic = "force-dynamic";

export default async function ContractSettingsPage() {
  const { t } = await getServerTranslation();
  const [supabase, { orgId }] = await Promise.all([
    getCachedServerSupabaseClient(),
    requireOrgAdminSettingsAccess(),
  ]);

  const { data: org } = await supabase
    .from("organizations")
    .select("contracts_enabled, legal_terms_approved_at")
    .eq("id", orgId)
    .maybeSingle();

  const { data: template } = await contractFrom(supabase, "contract_templates")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("is_default", true)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("contracts.settingsTitle")}
        description={t("contracts.settingsDescription")}
      />
      <ContractSettingsForm
        organizationId={orgId}
        contractsEnabled={Boolean((org as { contracts_enabled?: boolean } | null)?.contracts_enabled)}
        legalApproved={Boolean(
          (org as { legal_terms_approved_at?: string | null } | null)?.legal_terms_approved_at,
        )}
        hasTemplate={Boolean(template)}
      />
      {!isEmailConfigured() ? (
        <p className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          {t("contracts.emailNotConfigured")}
        </p>
      ) : null}
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <FileText className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t("contracts.termsNotApproved")}
      </p>
    </div>
  );
}
