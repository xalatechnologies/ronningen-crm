"use client";

import Link from "next/link";

import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { SAAS_MONTHLY_PRICE_NOK } from "@/lib/billing/constants";
import {
  shouldShowTrialEndingWarning,
  toTenantAccessInput,
  trialDaysLeft,
} from "@/lib/subscriptions/subscription-utils";

export function SubscriptionWarningBanner() {
  const { currentOrganization } = useCurrentOrganization();

  if (!currentOrganization) return null;

  const accessInput = toTenantAccessInput(currentOrganization);
  const showTrialEnding = shouldShowTrialEndingWarning(accessInput);

  if (!showTrialEnding) {
    return null;
  }

  const daysLeft = trialDaysLeft(accessInput);
  const daysLabel =
    daysLeft != null && daysLeft >= 0
      ? `${daysLeft} ${daysLeft === 1 ? "dag" : "dager"}`
      : "snart";
  const hasStripe = Boolean(currentOrganization.providerSubscriptionId);

  return (
    <div className="border-b-2 border-rn-accent-border/50 bg-rn-surface-gradient-from px-[length:var(--app-page-padding-mobile)] py-3 text-app-sm text-foreground md:px-[length:var(--app-page-padding-tablet)] lg:px-[length:var(--app-page-padding-desktop)]">
      {hasStripe ? (
        <>
          Prøveperioden utløper om {daysLabel}. Du blir belastet{" "}
          {SAAS_MONTHLY_PRICE_NOK} kr/mnd når prøven er over.{" "}
        </>
      ) : (
        <>
          Prøveperioden utløper om {daysLabel}. Legg til betaling for å fortsette
          å bruke appen.{" "}
        </>
      )}
      <Link
        href="/app/settings/billing"
        className="font-semibold text-success underline underline-offset-2"
      >
        Se abonnement
      </Link>
    </div>
  );
}
