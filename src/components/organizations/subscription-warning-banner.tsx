"use client";

import Link from "next/link";

import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { shouldShowSubscriptionWarning } from "@/lib/subscriptions/subscription-utils";

export function SubscriptionWarningBanner() {
  const { currentOrganization } = useCurrentOrganization();

  if (
    !currentOrganization ||
    !shouldShowSubscriptionWarning(currentOrganization.subscriptionStatus)
  ) {
    return null;
  }

  return (
    <div className="border-b-2 border-amber-500/40 bg-amber-500/10 px-[length:var(--app-page-padding-mobile)] py-3 text-app-sm text-amber-950 md:px-[length:var(--app-page-padding-tablet)] lg:px-[length:var(--app-page-padding-desktop)] dark:text-amber-100">
      Abonnementet er forfalt. Oppdater betaling for å unngå avbrudd.{" "}
      <Link
        href="/app/settings/billing"
        className="font-semibold underline underline-offset-2"
      >
        Gå til fakturering
      </Link>
    </div>
  );
}
