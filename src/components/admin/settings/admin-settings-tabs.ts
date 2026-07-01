import type { Translator } from "@/i18n/types";

export const ADMIN_SETTINGS_TAB_IDS = [
  "integrations",
  "commercial",
  "access",
  "environment",
] as const;

export type AdminSettingsTabId = (typeof ADMIN_SETTINGS_TAB_IDS)[number];

const TAB_IDS = new Set<string>(ADMIN_SETTINGS_TAB_IDS);

export function adminSettingsTabs(t: Translator) {
  return ADMIN_SETTINGS_TAB_IDS.map((id) => ({
    id,
    label: t(`admin.settings_tab_${id}`),
  }));
}

export function parseAdminSettingsTab(
  value: string | null | undefined,
): AdminSettingsTabId {
  if (value && TAB_IDS.has(value)) {
    return value as AdminSettingsTabId;
  }
  return "integrations";
}
