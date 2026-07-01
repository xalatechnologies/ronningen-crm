"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getServerTranslation } from "@/i18n/server";

type FeatureFlagRow = {
  enabled_global: boolean;
  rollout_percentage: number;
  enabled_at: string | null;
  organization_overrides: Record<string, boolean>;
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

export async function updateFeatureFlag(input: {
  key: string;
  enabledGlobal?: boolean;
  rolloutPercentage?: number;
  enabledAt?: string | null;
  organizationOverrides?: Record<string, boolean>;
}) {
  const { t } = await getServerTranslation();
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: beforeRow, error: fetchError } = await admin
    .from("platform_feature_flags")
    .select(
      "enabled_global, rollout_percentage, enabled_at, organization_overrides",
    )
    .eq("key", input.key)
    .maybeSingle();

  if (fetchError) return { ok: false as const, error: fetchError.message };
  if (!beforeRow) {
    return { ok: false as const, error: "Funksjonsflagg ikke funnet" };
  }

  const before: FeatureFlagRow = {
    enabled_global: beforeRow.enabled_global,
    rollout_percentage: beforeRow.rollout_percentage,
    enabled_at: beforeRow.enabled_at,
    organization_overrides: parseOrganizationOverrides(
      beforeRow.organization_overrides,
    ),
  };

  const update: {
    enabled_global?: boolean;
    rollout_percentage?: number;
    enabled_at?: string | null;
    organization_overrides?: Record<string, boolean>;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.enabledGlobal !== undefined) {
    update.enabled_global = input.enabledGlobal;
    if (input.enabledGlobal) {
      update.rollout_percentage = 0;
    }
  }

  if (input.rolloutPercentage !== undefined) {
    if (input.rolloutPercentage < 0 || input.rolloutPercentage > 100) {
      return {
        ok: false as const,
        error: t("serverErrors.admin.rolloutRange"),
      };
    }
    update.rollout_percentage = input.rolloutPercentage;
  }

  if (input.enabledAt !== undefined) {
    update.enabled_at = input.enabledAt;
  }

  if (input.organizationOverrides !== undefined) {
    update.organization_overrides = input.organizationOverrides;
  }

  const { error } = await admin
    .from("platform_feature_flags")
    .update(update)
    .eq("key", input.key);

  if (error) return { ok: false as const, error: error.message };

  const after = {
    enabled_global: update.enabled_global ?? before.enabled_global,
    rollout_percentage: update.rollout_percentage ?? before.rollout_percentage,
    enabled_at:
      input.enabledAt !== undefined ? input.enabledAt : before.enabled_at,
    organization_overrides:
      update.organization_overrides ?? before.organization_overrides,
  };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "feature_flag.updated",
    targetType: "feature_flag",
    targetId: input.key,
    metadata: { before, after },
  });

  revalidatePath("/admin/feature-flags");
  return { ok: true as const };
}

export async function toggleFeatureFlag(input: {
  key: string;
  enabledGlobal: boolean;
}) {
  return updateFeatureFlag({
    key: input.key,
    enabledGlobal: input.enabledGlobal,
  });
}
