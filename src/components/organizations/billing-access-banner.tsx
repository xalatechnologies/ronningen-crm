import Link from "next/link";

import { getTenantAppAccess } from "@/lib/organizations/require-tenant-app-access";
import { TENANT_BILLING_PATH } from "@/lib/subscriptions/subscription-utils";

export async function BillingAccessBanner() {
  const ctx = await getTenantAppAccess(TENANT_BILLING_PATH);

  if (!ctx || ctx.accessLevel !== "billing_only") {
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
