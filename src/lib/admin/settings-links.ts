import { adminRoutes } from "@/config/admin-routes";
import type { AdminSettingsTabId } from "@/components/admin/settings/admin-settings-tabs";

export function adminSettingsHref(tab?: AdminSettingsTabId): string {
  if (!tab || tab === "integrations") {
    return adminRoutes.settings;
  }
  return `${adminRoutes.settings}?tab=${tab}`;
}
