import { isBillingEnabled } from "@/lib/billing/constants";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

const ENV_FLAG_FALLBACKS: Record<string, () => boolean> = {
  billing_enabled: isBillingEnabled,
};

export async function isFeatureEnabled(
  key: string,
  organizationId?: string | null,
): Promise<boolean> {
  const envFallback = ENV_FLAG_FALLBACKS[key];
  if (envFallback && !organizationId) {
    return envFallback();
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: flag } = await admin
      .from("platform_feature_flags")
      .select("enabled_global, rollout_percentage, organization_overrides, enabled_at")
      .eq("key", key)
      .maybeSingle();

    if (!flag) {
      return envFallback?.() ?? false;
    }

    if (flag.enabled_at && new Date(flag.enabled_at) > new Date()) {
      return false;
    }

    if (organizationId) {
      const overrides = flag.organization_overrides as Record<string, boolean>;
      if (organizationId in overrides) {
        return Boolean(overrides[organizationId]);
      }
    }

    if (flag.enabled_global) return true;

    if (organizationId && flag.rollout_percentage > 0) {
      const hash = simpleHash(`${key}:${organizationId}`);
      return hash % 100 < flag.rollout_percentage;
    }

    return envFallback?.() ?? false;
  } catch {
    return envFallback?.() ?? false;
  }
}

function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
