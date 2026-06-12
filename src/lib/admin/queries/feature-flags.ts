import {
  computeFeatureFlagStats,
  type AdminFeatureFlagOverviewStats,
} from "@/lib/admin/feature-flag-status";
import { isBillingEnabled } from "@/lib/billing/billing-env";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

export type { AdminFeatureFlagOverviewStats };

export type AdminFeatureFlag = {
  key: string;
  description: string;
  enabledGlobal: boolean;
  rolloutPercentage: number;
  enabledAt: string | null;
  updatedAt: string;
  organizationOverrides: Record<string, boolean>;
  overrideCount: number;
};

export type AdminFeatureFlagPageData = {
  flags: AdminFeatureFlag[];
  orgNames: Record<string, string>;
  stats: AdminFeatureFlagOverviewStats;
  billingEnvEnabled: boolean;
};

function parseOrganizationOverrides(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, boolean> = {};
  for (const [orgId, enabled] of Object.entries(value)) {
    if (typeof enabled === "boolean") {
      result[orgId] = enabled;
    }
  }
  return result;
}

function mapFeatureFlagRow(row: {
  key: string;
  description: string;
  enabled_global: boolean;
  rollout_percentage: number;
  enabled_at: string | null;
  updated_at: string;
  organization_overrides: unknown;
}): AdminFeatureFlag {
  const organizationOverrides = parseOrganizationOverrides(
    row.organization_overrides,
  );

  return {
    key: row.key,
    description: row.description,
    enabledGlobal: row.enabled_global,
    rolloutPercentage: row.rollout_percentage,
    enabledAt: row.enabled_at,
    updatedAt: row.updated_at,
    organizationOverrides,
    overrideCount: Object.keys(organizationOverrides).length,
  };
}

export async function fetchAdminFeatureFlags(): Promise<AdminFeatureFlag[]> {
  const data = await fetchAdminFeatureFlagPageData();
  return data.flags;
}

export async function fetchAdminFeatureFlagPageData(): Promise<AdminFeatureFlagPageData> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("platform_feature_flags")
    .select(
      "key, description, enabled_global, rollout_percentage, enabled_at, updated_at, organization_overrides",
    )
    .order("key", { ascending: true });

  if (error) throw error;

  const flags = (data ?? []).map(mapFeatureFlagRow);
  const orgIds = [
    ...new Set(flags.flatMap((flag) => Object.keys(flag.organizationOverrides))),
  ];

  const orgNames: Record<string, string> = {};
  if (orgIds.length > 0) {
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);

    for (const org of orgs ?? []) {
      orgNames[org.id] = org.name;
    }
  }

  const billingEnvEnabled = isBillingEnabled();

  return {
    flags,
    orgNames,
    stats: computeFeatureFlagStats(flags),
    billingEnvEnabled,
  };
}
