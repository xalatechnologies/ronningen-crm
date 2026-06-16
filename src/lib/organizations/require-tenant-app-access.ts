import {
  isAllowedWhenBillingBlocked,
  isAllowedWhenSuspended,
  resolveTenantAccess,
  TENANT_BILLING_PATH,
  TENANT_ONBOARDING_PATH,
  TENANT_SUSPENDED_PATH,
  type TenantAccessLevel,
} from "@/lib/subscriptions/subscription-utils";
import { isBillingEnabled } from "@/lib/billing/constants";
import { getImpersonationContext } from "@/lib/admin/impersonation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cache } from "react";
import { redirect } from "next/navigation";

export type TenantAppAccessContext = {
  userId: string;
  organizationId: string | null;
  accessLevel: TenantAccessLevel;
  suspendedReason: string | null;
};

const EXEMPT_PATH_PREFIXES = [
  TENANT_ONBOARDING_PATH,
  TENANT_SUSPENDED_PATH,
];

export async function getTenantAppAccess(
  pathname: string,
): Promise<TenantAppAccessContext | null> {
  return getTenantAppAccessCached(pathname);
}

const getTenantAppAccessCached = cache(async function getTenantAppAccessCached(
  _pathname: string,
): Promise<TenantAppAccessContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const impersonation = await getImpersonationContext();

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const organizationId =
    impersonation?.organizationId ?? profile?.active_organization_id ?? null;

  if (!organizationId) {
    return {
      userId: user.id,
      organizationId: null,
      accessLevel: "full",
      suspendedReason: null,
    };
  }

  const [{ data: org }, { data: subscription }] = await Promise.all([
    supabase
      .from("organizations")
      .select("is_suspended, subscription_status, suspended_reason")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("current_period_end, provider_subscription_id")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  if (!org) {
    return {
      userId: user.id,
      organizationId,
      accessLevel: "full",
      suspendedReason: null,
    };
  }

  const accessLevel = resolveTenantAccess(
    {
      is_suspended: org.is_suspended,
      subscription_status: org.subscription_status,
      current_period_end: subscription?.current_period_end ?? null,
      provider_subscription_id: subscription?.provider_subscription_id ?? null,
    },
    { billingEnabled: isBillingEnabled() },
  );

  return {
    userId: user.id,
    organizationId,
    accessLevel,
    suspendedReason: org.suspended_reason,
  };
});

async function requireAuthenticatedUser(): Promise<{ userId: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  return { userId: user.id };
}

export async function requireTenantAppAccess(pathname: string): Promise<TenantAppAccessContext> {
  if (EXEMPT_PATH_PREFIXES.some((prefix) => pathname === prefix)) {
    const { userId } = await requireAuthenticatedUser();
    return {
      userId,
      organizationId: null,
      accessLevel: "full",
      suspendedReason: null,
    };
  }

  const ctx = await getTenantAppAccessCached(pathname);
  if (!ctx) redirect("/auth/login");

  if (!ctx.organizationId && pathname !== TENANT_ONBOARDING_PATH) {
    redirect(TENANT_ONBOARDING_PATH);
  }

  if (ctx.accessLevel === "suspended" && !isAllowedWhenSuspended(pathname)) {
    redirect(TENANT_SUSPENDED_PATH);
  }

  if (
    ctx.accessLevel === "billing_only" &&
    !isAllowedWhenBillingBlocked(pathname)
  ) {
    redirect(TENANT_BILLING_PATH);
  }

  return ctx;
}
