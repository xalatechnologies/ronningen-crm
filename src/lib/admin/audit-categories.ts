import type { Translator } from "@/i18n/types";

export type AdminAuditCategory =
  | "all"
  | "organization"
  | "subscription"
  | "users"
  | "support"
  | "platform";

const ADMIN_AUDIT_CATEGORY_VALUES: AdminAuditCategory[] = [
  "all",
  "organization",
  "subscription",
  "users",
  "support",
  "platform",
];

export function getAdminAuditCategoryOptions(t: Translator): {
  value: AdminAuditCategory;
  label: string;
}[] {
  return ADMIN_AUDIT_CATEGORY_VALUES.map((value) => ({
    value,
    label: t(`audit.categories.${value}`),
  }));
}

export const PLATFORM_AUDIT_ACTION_PREFIXES = [
  "impersonation.",
  "feature_flag.",
  "notification.",
  "export.",
] as const;

export function platformAuditOrFilter(): string {
  return PLATFORM_AUDIT_ACTION_PREFIXES.map(
    (prefix) => `action.like.${prefix}%`,
  ).join(",");
}

export function resolveAuditCategory(action: string): AdminAuditCategory {
  if (action.startsWith("organization.subscription") || action.startsWith("subscription.")) {
    return "subscription";
  }
  if (action.startsWith("organization.")) return "organization";
  if (action.startsWith("user.")) return "users";
  if (action.startsWith("support.")) return "support";
  if (PLATFORM_AUDIT_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix))) {
    return "platform";
  }
  return "platform";
}

export function matchesAuditCategory(
  action: string,
  category: AdminAuditCategory,
): boolean {
  if (category === "all") return true;
  return resolveAuditCategory(action) === category;
}

export function computeAuditCategoryCounts(
  actionCounts: { action: string; count: number }[],
): Record<AdminAuditCategory, number> {
  const counts: Record<AdminAuditCategory, number> = {
    all: 0,
    organization: 0,
    subscription: 0,
    users: 0,
    support: 0,
    platform: 0,
  };

  for (const { action, count } of actionCounts) {
    counts.all += count;
    counts[resolveAuditCategory(action)] += count;
  }

  return counts;
}
