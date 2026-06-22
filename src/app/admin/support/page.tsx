import { AdminSupportWorkspace } from "@/components/admin/admin-support-workspace";
import type { AdminSupportFilter } from "@/lib/admin/dashboard-links";
import { fetchAdminSupportOverview } from "@/lib/admin/queries/support";
type PageProps = {
  searchParams: Promise<{ filter?: string; q?: string }>;
};

function parseFilter(value: string | undefined): AdminSupportFilter {
  if (value === "open" || value === "waiting" || value === "resolved") {
    return value;
  }
  return "all";
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await fetchAdminSupportOverview();

  return (
    <AdminSupportWorkspace
      data={data}
      initialFilter={parseFilter(params.filter)}
      initialSearch={params.q ?? ""}
    />
  );
}
