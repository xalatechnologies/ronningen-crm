export const CUSTOMERS_PAGE_TABS = [
  { id: "customers", label: "Kunder" },
  { id: "partners", label: "Partnere" },
] as const;

export type CustomersPageTabId =
  (typeof CUSTOMERS_PAGE_TABS)[number]["id"];

const TAB_IDS = new Set<string>(
  CUSTOMERS_PAGE_TABS.map((tab) => tab.id),
);

export function parseCustomersPageTab(
  value: string | null | undefined,
): CustomersPageTabId {
  if (value && TAB_IDS.has(value)) {
    return value as CustomersPageTabId;
  }
  return "customers";
}

export function customersPageTabLabel(tab: CustomersPageTabId): string {
  return CUSTOMERS_PAGE_TABS.find((t) => t.id === tab)?.label ?? "Kunder";
}
