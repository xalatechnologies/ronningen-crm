"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { OrganizationEmptyState } from "@/components/organizations/organization-empty-state";
import { SubscriptionWarningBanner } from "@/components/organizations/subscription-warning-banner";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useAuthUser } from "@/hooks/use-auth-user";
import { isBillingEnabled } from "@/lib/billing/constants";
import {
  isAllowedWhenBillingBlocked,
  isAllowedWhenSuspended,
  isBillingOnlyAccess,
  isSuspendedAccess,
  TENANT_BILLING_PATH,
  TENANT_ONBOARDING_PATH,
  TENANT_SUSPENDED_PATH,
  toTenantAccessInput,
} from "@/lib/subscriptions/subscription-utils";

function GateLoadingState({ label = "Laster …" }: { label?: string }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4 py-16 text-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="size-10 animate-spin rounded-full border-4 border-muted border-t-success" />
      <p className="text-base font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export function OrganizationGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading: authLoading } = useAuthUser();
  const {
    organizations,
    currentOrganization,
    loading: orgLoading,
  } = useCurrentOrganization();

  const loading = authLoading || orgLoading;
  const hasOrganizations = organizations.length > 0;
  const showGateLoader =
    authLoading || !isAuthenticated || (orgLoading && !hasOrganizations);
  const onOnboarding = pathname === TENANT_ONBOARDING_PATH;
  const suspendedBlocked =
    currentOrganization && isSuspendedAccess(currentOrganization);
  const billingBlocked =
    currentOrganization &&
    !currentOrganization.isSuspended &&
    isBillingOnlyAccess(toTenantAccessInput(currentOrganization), {
      billingEnabled: isBillingEnabled(),
    });

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    if (!hasOrganizations && !onOnboarding) {
      router.replace(TENANT_ONBOARDING_PATH);
      return;
    }

    if (hasOrganizations && onOnboarding) {
      router.replace("/app/dashboard");
      return;
    }

    if (suspendedBlocked && !isAllowedWhenSuspended(pathname)) {
      router.replace(TENANT_SUSPENDED_PATH);
      return;
    }

    if (billingBlocked && !isAllowedWhenBillingBlocked(pathname)) {
      router.replace(TENANT_BILLING_PATH);
    }
  }, [
    billingBlocked,
    hasOrganizations,
    isAuthenticated,
    loading,
    onOnboarding,
    pathname,
    router,
    suspendedBlocked,
  ]);

  if (showGateLoader) {
    return <GateLoadingState />;
  }

  if (!hasOrganizations && !onOnboarding) {
    return <OrganizationEmptyState />;
  }

  if (onOnboarding) {
    return <>{children}</>;
  }

  return (
    <>
      <SubscriptionWarningBanner />
      {children}
    </>
  );
}
