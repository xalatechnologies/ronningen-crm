import { AdminRevenueWorkspace } from "@/components/admin/admin-revenue-workspace";
import { fetchAdminRevenueOverview } from "@/lib/admin/queries/revenue";

export default async function AdminRevenuePage() {
  const data = await fetchAdminRevenueOverview();

  return <AdminRevenueWorkspace data={data} />;
}
