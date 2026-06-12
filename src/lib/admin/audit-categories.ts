export type AdminAuditCategory =
  | "all"
  | "organization"
  | "subscription"
  | "users"
  | "support"
  | "platform";

export const ADMIN_AUDIT_CATEGORY_OPTIONS: {
  value: AdminAuditCategory;
  label: string;
}[] = [
  { value: "all", label: "Alle" },
  { value: "organization", label: "Organisasjon" },
  { value: "subscription", label: "Abonnement" },
  { value: "users", label: "Brukere" },
  { value: "support", label: "Support" },
  { value: "platform", label: "Plattform" },
];

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
