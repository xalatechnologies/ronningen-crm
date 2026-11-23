import { AppPageHeader } from "@/components/layout/app-page-header";
import { ContractSettingsCard } from "@/features/contract-settings/components/contract-settings-card";
import { PortalSettingsCard } from "@/features/contract-settings/components/portal-settings-card";
import { ReadinessCard } from "@/features/contract-settings/components/readiness-card";
import { TemplateEditor } from "@/features/contract-settings/components/template-editor";
import { TemplateList } from "@/features/contract-settings/components/template-list";
import { listTemplates, loadTemplate } from "@/lib/contracts/templates";
import { getServerTranslation } from "@/i18n/server";
import { contractFrom } from "@/lib/contracts/db";
import { requireOrgAdminSettingsAccess } from "@/lib/settings/require-settings-access";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { isEmailConfigured } from "@/lib/notifications/email-client";

export const dynamic = "force-dynamic";

export default async function ContractSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mal?: string }>;
}) {
  const { mal } = await searchParams;
  const { t } = await getServerTranslation();
  const [supabase, { orgId }] = await Promise.all([
    getCachedServerSupabaseClient(),
    requireOrgAdminSettingsAccess(),
  ]);

  const { data: org } = await supabase
    .from("organizations")
    .select("contracts_enabled, legal_terms_approved_at, portal_enabled, portal_auto_invite, portal_guest_invites_enabled" as "contracts_enabled, legal_terms_approved_at")
    .eq("id", orgId)
    .maybeSingle();

  const { data: template } = await contractFrom(supabase, "contract_templates")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("is_default", true)
    .maybeSingle();

  const [loaded, listed] = await Promise.all([
    loadTemplate(orgId, mal && /^[0-9a-f-]{36}$/.test(mal) ? mal : undefined),
    listTemplates(orgId),
  ]);
  const templateData = loaded.ok ? loaded.template : null;

  const contractsEnabled = Boolean((org as { contracts_enabled?: boolean } | null)?.contracts_enabled);
  const legalApproved = Boolean((org as { legal_terms_approved_at?: string | null } | null)?.legal_terms_approved_at);

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("contracts.settingsTitle")}
        description={t("contracts.settingsDescription")}
      />
      <ReadinessCard
        contractsEnabled={contractsEnabled}
        termsApproved={legalApproved}
        hasTemplate={Boolean(template)}
        emailConfigured={isEmailConfigured()}
      />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <ContractSettingsCard
          organizationId={orgId}
          contractsEnabled={contractsEnabled}
          legalApproved={legalApproved}
          hasTemplate={Boolean(template)}
        />
        <PortalSettingsCard
          organizationId={orgId}
          enabled={Boolean((org as { portal_enabled?: boolean } | null)?.portal_enabled)}
          autoInvite={(org as { portal_auto_invite?: boolean } | null)?.portal_auto_invite ?? true}
          guestInvites={Boolean((org as { portal_guest_invites_enabled?: boolean } | null)?.portal_guest_invites_enabled)}
        />
      </div>
      {templateData && listed.ok ? (
        <TemplateList organizationId={orgId} templates={listed.templates} activeTemplateId={templateData.templateId} />
      ) : null}
      {templateData ? (
        <TemplateEditor
          key={templateData.templateId}
          organizationId={orgId}
          templateId={templateData.templateId}
          versionNumber={templateData.versionNumber}
          initial={templateData.fields}
        />
      ) : null}
    </div>
  );
}
