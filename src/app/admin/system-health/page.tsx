import { AdminSystemHealthWorkspace } from "@/components/admin/admin-system-health-workspace";
import { fetchAdminSystemHealthOverview } from "@/lib/admin/queries/system-health";

export default async function AdminSystemHealthPage() {
  const data = await fetchAdminSystemHealthOverview();
  return <AdminSystemHealthWorkspace data={data} />;
}
