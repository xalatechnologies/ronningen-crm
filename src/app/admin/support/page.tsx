import { SupportWorkspace } from "@/features/admin-support/components/support-workspace";
import { fetchAdminSupportOverview } from "@/lib/admin/queries/support";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const data = await fetchAdminSupportOverview();
  return <SupportWorkspace data={data} nowIso={new Date().toISOString()} />;
}
