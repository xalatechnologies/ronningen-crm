import type { Translator } from "@/i18n/types";

export const ORGANIZATION_DETAIL_TAB_IDS = [
  "profile",
  "subscription",
  "members",
  "usage",
  "billing",
  "support",
] as const;

export type OrganizationDetailTabId =
  (typeof ORGANIZATION_DETAIL_TAB_IDS)[number];

const TAB_IDS = new Set<string>(ORGANIZATION_DETAIL_TAB_IDS);

export function getOrganizationDetailTabs(t: Translator) {
  return [
    { id: "profile" as const, label: t("adminLabels.fields.profile") },
    { id: "subscription" as const, label: t("adminLabels.fields.subscription") },
    { id: "members" as const, label: t("adminLabels.fields.members") },
    { id: "usage" as const, label: t("adminLabels.fields.usage") },
    { id: "billing" as const, label: t("adminLabels.fields.billing") },
    { id: "support" as const, label: t("adminLabels.fields.support") },
  ];
}

export function parseOrganizationDetailTab(
  value: string | null | undefined,
): OrganizationDetailTabId {
  if (value && TAB_IDS.has(value)) {
    return value as OrganizationDetailTabId;
  }
  return "profile";
}
