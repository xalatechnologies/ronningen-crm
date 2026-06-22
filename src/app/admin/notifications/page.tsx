import { AdminNotificationsWorkspace } from "@/components/admin/admin-notifications-workspace";
import type { AdminNotificationView } from "@/lib/admin/notification-filters";
import { isEmailConfigured } from "@/lib/notifications/email-client";
import { fetchAdminNotificationsPageData } from "@/lib/admin/queries/notifications";
import { usePageSearchParams } from "@/lib/next/dynamic-page-props";

type PageProps = {
  searchParams: Promise<{
    view?: string;
    filter?: string;
    q?: string;
  }>;
};

const VALID_VIEWS = new Set<AdminNotificationView>([
  "templates",
  "campaigns",
  "deliveries",
]);

function parseView(value: string | undefined): AdminNotificationView {
  if (value && VALID_VIEWS.has(value as AdminNotificationView)) {
    return value as AdminNotificationView;
  }
  return "templates";
}

export default async function AdminNotificationsPage({
  searchParams,
}: PageProps) {
  const params = usePageSearchParams(searchParams);
  const view = parseView(params.view);
  const filter = params.filter ?? "all";
  const search = params.q ?? "";

  const data = await fetchAdminNotificationsPageData();

  return (
    <AdminNotificationsWorkspace
      templates={data.templates}
      campaigns={data.campaigns}
      deliveries={data.deliveries}
      deliveryTotal={data.deliveryTotal}
      deliveryFilterCounts={data.deliveryFilterCounts}
      stats={data.stats}
      initialView={view}
      initialFilter={filter}
      initialSearch={search}
      emailConfigured={isEmailConfigured()}
    />
  );
}
