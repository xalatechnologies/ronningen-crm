import {
  AdminUsersWorkspace,
  type AdminUserFilter,
} from "@/components/admin/admin-users-workspace";
import { fetchAdminUsers } from "@/lib/admin/queries/users-billing-audit";
type PageProps = {
  searchParams: Promise<{ filter?: string; q?: string }>;
};

function parseFilter(value: string | undefined): AdminUserFilter {
  if (
    value === "platform_admin" ||
    value === "no_org" ||
    value === "inactive"
  ) {
    return value;
  }
  return "all";
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const users = await fetchAdminUsers();

  return (
    <AdminUsersWorkspace
      users={users}
      initialFilter={parseFilter(params.filter)}
      initialSearch={params.q ?? ""}
    />
  );
}
