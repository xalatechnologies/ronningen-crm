import { AdminUserDetailWorkspace } from "@/components/admin/admin-user-detail-workspace";
import { parseUserDetailTab } from "@/components/admin/user-detail/tabs";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { fetchAdminUserDetail } from "@/lib/admin/queries/users-billing-audit";
import {
  usePageParams,
  usePageSearchParams,
} from "@/lib/next/dynamic-page-props";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = usePageParams(params);
  const { tab: tabParam } = usePageSearchParams(searchParams);
  const initialTab = parseUserDetailTab(tabParam);

  const admin = await requirePlatformAdmin();
  const user = await fetchAdminUserDetail(id);

  if (!user) notFound();

  return (
    <AdminUserDetailWorkspace
      user={user}
      currentAdminUserId={admin.userId}
      initialTab={initialTab}
    />
  );
}
