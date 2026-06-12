import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import {
  buildAllIntegrationStatuses,
  buildEnvChecklist,
  computeIntegrationSummary,
  countMissingRequiredEnv,
  type EnvChecklistItem,
  type HealthStatus,
  type PlatformIntegrationComponent,
} from "@/lib/admin/platform-integration-status";
import {
  isBillingEnabled,
  isStripeConfigured,
  resolveStripePriceId,
  SAAS_MONTHLY_PRICE_NOK,
  SAAS_PLAN_ID,
  SAAS_TRIAL_DAYS,
} from "@/lib/billing/constants";

export type AdminSettingsCommercial = {
  trialDays: number;
  monthlyPriceNok: number;
  billingEnabled: boolean;
  stripePriceId: string | null;
  planId: string;
};

export type AdminSettingsSummary = {
  overallStatus: HealthStatus;
  configuredCount: number;
  totalCount: number;
  missingRequiredCount: number;
};

export type AdminPlatformAdmin = {
  id: string;
  email: string | null;
  fullName: string | null;
};

export type AdminSettingsOverview = {
  commercial: AdminSettingsCommercial;
  integrations: PlatformIntegrationComponent[];
  envChecklist: EnvChecklistItem[];
  platformAdmins: AdminPlatformAdmin[];
  summary: AdminSettingsSummary;
  stripeConfigured: boolean;
};

export async function fetchAdminSettingsOverview(): Promise<AdminSettingsOverview> {
  const admin = createSupabaseAdminClient();

  const { data: admins } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("is_platform_admin", true)
    .order("email");

  const integrations = buildAllIntegrationStatuses();
  const envChecklist = buildEnvChecklist();
  const integrationSummary = computeIntegrationSummary(integrations);

  return {
    commercial: {
      trialDays: SAAS_TRIAL_DAYS,
      monthlyPriceNok: SAAS_MONTHLY_PRICE_NOK,
      billingEnabled: isBillingEnabled(),
      stripePriceId: resolveStripePriceId(),
      planId: SAAS_PLAN_ID,
    },
    integrations,
    envChecklist,
    platformAdmins: (admins ?? []).map((a) => ({
      id: a.id,
      email: a.email,
      fullName: a.full_name,
    })),
    summary: {
      ...integrationSummary,
      missingRequiredCount: countMissingRequiredEnv(envChecklist),
    },
    stripeConfigured: isStripeConfigured(),
  };
}
