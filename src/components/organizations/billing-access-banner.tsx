"use client";

import Link from "next/link";

import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { isBillingEnabled } from "@/lib/billing/constants";
import {
  isBillingOnlyAccess,
  TENANT_BILLING_PATH,
  toTenantAccessInput,
} from "@/lib/subscriptions/subscription-utils";

export function BillingAccessBanner() {
  const { currentOrganization, loading } = useCurrentOrganization();

  if (loading || !currentOrganization) {
    return null;
  }

  const billingBlocked = isBillingOnlyAccess(
    toTenantAccessInput(currentOrganization),
    { billingEnabled: isBillingEnabled() },
  );

  if (!billingBlocked) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-[length:var(--app-radius)] border-2 border-destructive/50 bg-destructive/10 px-4 py-3 text-app-sm text-destructive"
    >
      App-tilgangen er stengt inntil betaling er i orden.{" "}
      <Link
        href={TENANT_BILLING_PATH}
        className="font-semibold underline underline-offset-2"
      >
        Fullfør betaling her
      </Link>{" "}
      for å få tilgang igjen.
    </div>
  );
}
