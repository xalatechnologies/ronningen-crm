import type { SubscriptionStatus } from "@/constants/roles";

export type SubscriptionAccessLevel = "full" | "warning" | "billing_only";

export function canAccessApp(status: SubscriptionStatus | string | null | undefined): SubscriptionAccessLevel {
  switch (status) {
    case "active":
    case "trialing":
      return "full";
    case "past_due":
      return "warning";
    case "canceled":
    case "incomplete":
      return "billing_only";
    default:
      return "full";
  }
}

export function isBillingOnlyAccess(status: SubscriptionStatus | string | null | undefined): boolean {
  return canAccessApp(status) === "billing_only";
}

export function shouldShowSubscriptionWarning(
  status: SubscriptionStatus | string | null | undefined,
): boolean {
  return canAccessApp(status) === "warning";
}
