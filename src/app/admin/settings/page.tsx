import { AdminSettingsWorkspace } from "@/components/admin/settings/admin-settings-workspace";
import { fetchAdminSettingsOverview } from "@/lib/admin/queries/settings";

export default async function AdminSettingsPage() {
  const settings = await fetchAdminSettingsOverview();
  return <AdminSettingsWorkspace settings={settings} />;
}
