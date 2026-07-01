import type { Translator } from "@/i18n/types";

export const USER_DETAIL_TAB_IDS = ["account", "organizations", "audit"] as const;

export type UserDetailTabId = (typeof USER_DETAIL_TAB_IDS)[number];

const TAB_IDS = new Set<string>(USER_DETAIL_TAB_IDS);

export function getUserDetailTabs(t: Translator) {
  return [
    { id: "account" as const, label: t("adminLabels.fields.account") },
    { id: "organizations" as const, label: t("adminLabels.fields.organizations") },
    { id: "audit" as const, label: t("adminLabels.fields.audit") },
  ];
}

export function parseUserDetailTab(
  value: string | null | undefined,
): UserDetailTabId {
  if (value && TAB_IDS.has(value)) {
    return value as UserDetailTabId;
  }
  return "account";
}
