export const ADMIN_SETTINGS_TABS = [
  { id: "integrations", label: "Integrasjoner" },
  { id: "commercial", label: "Kommersielt" },
  { id: "access", label: "Tilgang" },
  { id: "environment", label: "Miljø" },
] as const;

export type AdminSettingsTabId = (typeof ADMIN_SETTINGS_TABS)[number]["id"];

const TAB_IDS = new Set<string>(ADMIN_SETTINGS_TABS.map((tab) => tab.id));

export function parseAdminSettingsTab(
  value: string | null | undefined,
): AdminSettingsTabId {
  if (value && TAB_IDS.has(value)) {
    return value as AdminSettingsTabId;
  }
  return "integrations";
}
