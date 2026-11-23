"use client";

import Link from "next/link";

import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTranslation } from "@/i18n/client";
import { isBillingEnabled } from "@/lib/billing/constants";
import {
  isBillingOnlyAccess,
  TENANT_BILLING_PATH,
  toTenantAccessInput,
} from "@/lib/subscriptions/subscription-utils";

/** Shown while the app is closed until payment is in order. */
export function BillingAccessBanner() {
  const { t } = useTranslation();
  const { currentOrganization, loading } = useCurrentOrganization();

  if (loading || !currentOrganization) return null;

  const billingBlocked = isBillingOnlyAccess(toTenantAccessInput(currentOrganization), {
    billingEnabled: isBillingEnabled(),
  });
  if (!billingBlocked) return null;

  return (
    <div
      role="alert"
      className="rounded-2xl border border-status-danger-border bg-status-danger-bg px-4 py-3.5 text-app-sm text-status-danger-text md:px-5"
    >
      {t("billing.accessBlocked")}{" "}
      <Link href={TENANT_BILLING_PATH} className="font-semibold underline underline-offset-2">
        {t("billing.accessBlockedLink")}
      </Link>{" "}
      {t("billing.accessBlockedSuffix")}
    </div>
  );
}
