"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { OrganizationEmptyState } from "@/components/organizations/organization-empty-state";
import { SubscriptionWarningBanner } from "@/components/organizations/subscription-warning-banner";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useAuthUser } from "@/hooks/use-auth-user";
import { isBillingOnlyAccess } from "@/lib/subscriptions/subscription-utils";

const ONBOARDING_PATH = "/app/onboarding";
const BILLING_PATH = "/app/settings/billing";

function isAllowedWhenBillingBlocked(pathname: string): boolean {
  return (
    pathname === BILLING_PATH ||
    pathname.startsWith(`${BILLING_PATH}/`) ||
    pathname === ONBOARDING_PATH
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
  const onOnboarding = pathname === ONBOARDING_PATH;
  const billingBlocked =
    currentOrganization &&
    isBillingOnlyAccess(currentOrganization.subscriptionStatus);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    if (!hasOrganizations && !onOnboarding) {
      router.replace(ONBOARDING_PATH);
      return;
    }

    if (hasOrganizations && onOnboarding) {
      router.replace("/app/dashboard");
      return;
    }

    if (billingBlocked && !isAllowedWhenBillingBlocked(pathname)) {
      router.replace(BILLING_PATH);
    }
  }, [
    billingBlocked,
    hasOrganizations,
    isAuthenticated,
    loading,
    onOnboarding,
    pathname,
    router,
  ]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
        Laster…
      </div>
    );
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
