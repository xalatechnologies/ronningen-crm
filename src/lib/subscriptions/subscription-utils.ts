import type { SubscriptionStatus } from "@/constants/roles";

export type SubscriptionAccessLevel = "full" | "warning" | "billing_only";

export type TenantAccessLevel =
  | SubscriptionAccessLevel
  | "suspended";

export type TenantAccessInput = {
  is_suspended: boolean;
  subscription_status: string;
  current_period_end?: string | null;
  provider_subscription_id?: string | null;
};

export type TenantAccessOptions = {
  /** When true, orgs without a Stripe subscription cannot use the app. */
  billingEnabled?: boolean;
};

function lacksStripeSubscription(input: TenantAccessInput): boolean {
  return !input.provider_subscription_id?.trim();
}

function requiresBillingSetup(
  input: TenantAccessInput,
  options?: TenantAccessOptions,
): boolean {
  if (!options?.billingEnabled) return false;
  if (!lacksStripeSubscription(input)) return false;
  if (
    input.subscription_status === "trialing" &&
    !isTrialPeriodExpired(input)
  ) {
    return false;
  }
  return true;
}

export function isTrialPeriodExpired(input: TenantAccessInput): boolean {
  if (input.subscription_status !== "trialing") return false;
  if (!input.current_period_end) return false;
  return new Date(input.current_period_end) < new Date();
}

export function canAccessApp(
  status: SubscriptionStatus | string | null | undefined,
): SubscriptionAccessLevel {
  switch (status) {
    case "active":
    case "trialing":
      return "full";
    case "past_due":
      return "billing_only";
    case "canceled":
    case "incomplete":
      return "billing_only";
    default:
      return "full";
  }
}

export function resolveTenantAccess(
  org: TenantAccessInput,
  options?: TenantAccessOptions,
): TenantAccessLevel {
  if (org.is_suspended) return "suspended";
  if (requiresBillingSetup(org, options)) return "billing_only";
  if (isTrialPeriodExpired(org)) return "billing_only";
  return canAccessApp(org.subscription_status);
}

export function isBillingOnlyAccess(
  org:
    | (TenantAccessInput & TenantAccessOptions)
    | SubscriptionStatus
    | string
    | null
    | undefined,
  options?: TenantAccessOptions,
): boolean {
  if (org == null) return false;
  if (typeof org === "string") {
    return canAccessApp(org) === "billing_only";
  }
  const { billingEnabled, ...tenantInput } = org;
  return (
    resolveTenantAccess(tenantInput, {
      billingEnabled: options?.billingEnabled ?? billingEnabled,
    }) === "billing_only"
  );
}

export function isSuspendedAccess(
  org: {
    isSuspended?: boolean;
    is_suspended?: boolean;
    subscriptionStatus?: string;
    subscription_status?: string;
    periodEnd?: string | null;
    current_period_end?: string | null;
    providerSubscriptionId?: string | null;
    provider_subscription_id?: string | null;
  } | null | undefined,
): boolean {
  if (!org) return false;
  const isSuspended = org.isSuspended ?? org.is_suspended ?? false;
  return (
    resolveTenantAccess({
      is_suspended: isSuspended,
      subscription_status:
        org.subscriptionStatus ?? org.subscription_status ?? "active",
      current_period_end: org.periodEnd ?? org.current_period_end ?? null,
      provider_subscription_id:
        org.providerSubscriptionId ?? org.provider_subscription_id ?? null,
    }) === "suspended"
  );
}

export function shouldShowSubscriptionWarning(
  org:
    | (TenantAccessInput & TenantAccessOptions)
    | SubscriptionStatus
    | string
    | null
    | undefined,
  options?: TenantAccessOptions,
): boolean {
  if (org == null) return false;
  if (typeof org === "string") {
    return canAccessApp(org) === "warning";
  }
  const { billingEnabled, ...tenantInput } = org;
  return (
    resolveTenantAccess(tenantInput, {
      billingEnabled: options?.billingEnabled ?? billingEnabled,
    }) === "warning"
  );
}

export function shouldShowTrialEndingWarning(
  org: TenantAccessInput | null | undefined,
): boolean {
  if (!org || org.subscription_status !== "trialing") return false;
  if (!org.current_period_end) return false;

  const daysLeft = trialDaysLeft(org);
  if (daysLeft === null) return false;

  return daysLeft >= 0 && daysLeft <= 7;
}

/** Whole days until trial ends; negative when expired. */
export function trialDaysLeft(input: TenantAccessInput): number | null {
  if (!input.current_period_end) return null;
  return Math.ceil(
    (new Date(input.current_period_end).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );
}

import {
  TENANT_ACCOUNT_PATH,
  TENANT_ONBOARDING_PATH,
  TENANT_SETUP_LOKALER_PATH,
  TENANT_SETUP_ORGANIZATION_PATH,
} from "@/lib/organizations/tenant-setup";

export {
  TENANT_ACCOUNT_PATH,
  TENANT_ONBOARDING_PATH,
  TENANT_SETUP_LOKALER_PATH,
  TENANT_SETUP_ORGANIZATION_PATH,
};

export const TENANT_BILLING_PATH = "/app/settings/billing";
export const TENANT_SUPPORT_PATH = "/app/settings/support";
export const TENANT_SUSPENDED_PATH = "/app/suspended";

export function isAllowedWhenBillingBlocked(pathname: string): boolean {
  return (
    pathname === TENANT_BILLING_PATH ||
    pathname.startsWith(`${TENANT_BILLING_PATH}/`) ||
    pathname === TENANT_SUPPORT_PATH ||
    pathname.startsWith(`${TENANT_SUPPORT_PATH}/`) ||
    pathname === TENANT_ACCOUNT_PATH ||
    pathname.startsWith(`${TENANT_ACCOUNT_PATH}/`) ||
    pathname === TENANT_ONBOARDING_PATH ||
    pathname === TENANT_SETUP_ORGANIZATION_PATH ||
    pathname.startsWith(`${TENANT_SETUP_ORGANIZATION_PATH}/`) ||
    pathname === TENANT_SETUP_LOKALER_PATH ||
    pathname.startsWith(`${TENANT_SETUP_LOKALER_PATH}/`)
  );
}

export function isAllowedWhenSuspended(pathname: string): boolean {
  return (
    pathname === TENANT_SUSPENDED_PATH ||
    pathname.startsWith(`${TENANT_SUSPENDED_PATH}/`) ||
    pathname === TENANT_SUPPORT_PATH ||
    pathname.startsWith(`${TENANT_SUPPORT_PATH}/`)
  );
}

export function toTenantAccessInput(org: {
  isSuspended?: boolean;
  is_suspended?: boolean;
  subscriptionStatus?: string;
  subscription_status?: string;
  periodEnd?: string | null;
  current_period_end?: string | null;
  providerSubscriptionId?: string | null;
  provider_subscription_id?: string | null;
}): TenantAccessInput {
  return {
    is_suspended: org.isSuspended ?? org.is_suspended ?? false,
    subscription_status:
      org.subscriptionStatus ?? org.subscription_status ?? "active",
    current_period_end: org.periodEnd ?? org.current_period_end ?? null,
    provider_subscription_id:
      org.providerSubscriptionId ?? org.provider_subscription_id ?? null,
  };
}
