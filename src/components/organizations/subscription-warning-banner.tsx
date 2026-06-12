"use client";

import Link from "next/link";

import { useCurrentOrganization } from "@/hooks/use-current-organization";
import {
  shouldShowTrialEndingWarning,
  toTenantAccessInput,
} from "@/lib/subscriptions/subscription-utils";

export function SubscriptionWarningBanner() {
  const { currentOrganization } = useCurrentOrganization();

  if (!currentOrganization) return null;

  const accessInput = toTenantAccessInput(currentOrganization);
  const showTrialEnding = shouldShowTrialEndingWarning(accessInput);

  if (!showTrialEnding) {
    return null;
  }

  return (
    <div className="border-b-2 border-rn-accent-border/50 bg-rn-surface-gradient-from px-[length:var(--app-page-padding-mobile)] py-3 text-app-sm text-foreground md:px-[length:var(--app-page-padding-tablet)] lg:px-[length:var(--app-page-padding-desktop)]">
      Prøveperioden utløper snart. Du blir belastet 500 kr/mnd når prøven er
      over.{" "}
      <Link
        href="/app/settings/billing"
        className="font-semibold text-success underline underline-offset-2"
      >
        Se abonnement
      </Link>
    </div>
  );
}
