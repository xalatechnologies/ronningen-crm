export const ORGANIZATION_DETAIL_TABS = [
  { id: "profile", label: "Profil" },
  { id: "subscription", label: "Abonnement" },
  { id: "members", label: "Medlemmer" },
  { id: "usage", label: "Bruk" },
  { id: "billing", label: "Fakturering" },
  { id: "support", label: "Support" },
] as const;

export type OrganizationDetailTabId =
  (typeof ORGANIZATION_DETAIL_TABS)[number]["id"];

const TAB_IDS = new Set<string>(
  ORGANIZATION_DETAIL_TABS.map((tab) => tab.id),
);

export function parseOrganizationDetailTab(
  value: string | null | undefined,
): OrganizationDetailTabId {
  if (value && TAB_IDS.has(value)) {
    return value as OrganizationDetailTabId;
  }
  return "profile";
}
