export const USER_DETAIL_TABS = [
  { id: "account", label: "Konto" },
  { id: "organizations", label: "Organisasjoner" },
  { id: "audit", label: "Revisjon" },
] as const;

export type UserDetailTabId = (typeof USER_DETAIL_TABS)[number]["id"];

const TAB_IDS = new Set<string>(USER_DETAIL_TABS.map((tab) => tab.id));

export function parseUserDetailTab(
  value: string | null | undefined,
): UserDetailTabId {
  if (value && TAB_IDS.has(value)) {
    return value as UserDetailTabId;
  }
  return "account";
}
