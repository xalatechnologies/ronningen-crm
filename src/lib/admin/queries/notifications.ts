import {
  buildDeliveryFilterCounts,
  computeNotificationStats,
  type AdminDeliveryFilter,
  type AdminNotificationOverviewStats,
} from "@/lib/admin/notification-filters";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

export type { AdminNotificationOverviewStats };

export type AdminEmailTemplate = {
  key: string;
  subject: string;
  bodyHtml: string;
  updatedAt: string;
};

export type AdminNotificationCampaign = {
  id: string;
  name: string;
  templateKey: string | null;
  status: string;
  createdAt: string;
  deliveryCount: number;
};

export type AdminNotificationDelivery = {
  id: string;
  recipientEmail: string;
  campaignId: string | null;
  campaignName: string;
  status: string;
  createdAt: string;
};

export type AdminNotificationsPageData = {
  templates: AdminEmailTemplate[];
  campaigns: AdminNotificationCampaign[];
  deliveries: AdminNotificationDelivery[];
  deliveryTotal: number;
  deliveryFilterCounts: Record<AdminDeliveryFilter, number>;
  stats: AdminNotificationOverviewStats;
};

/** @deprecated Use fetchAdminNotificationsPageData */
export type AdminNotificationsOverview = {
  templates: { key: string; subject: string; updatedAt: string }[];
  campaigns: { id: string; name: string; status: string; createdAt: string }[];
  deliveryStats: { sent: number; failed: number };
};

async function countDeliveriesByStatus(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  status?: string,
): Promise<number> {
  let query = admin
    .from("platform_notification_deliveries")
    .select("id", { count: "exact", head: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchAdminNotificationsPageData(): Promise<AdminNotificationsPageData> {
  const admin = createSupabaseAdminClient();

  const [
    templatesResult,
    campaignsResult,
    deliveriesResult,
    deliveryTotal,
    failedCount,
    sentCount,
    deliveredCount,
    openedCount,
    inAppCount,
  ] = await Promise.all([
    admin
      .from("platform_email_templates")
      .select("key, subject, body_html, updated_at")
      .order("key"),
    admin
      .from("platform_notification_campaigns")
      .select("id, name, template_key, status, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("platform_notification_deliveries")
      .select("id, campaign_id, recipient_email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    countDeliveriesByStatus(admin),
    countDeliveriesByStatus(admin, "failed"),
    countDeliveriesByStatus(admin, "sent"),
    countDeliveriesByStatus(admin, "delivered"),
    countDeliveriesByStatus(admin, "opened"),
    admin
      .from("user_notifications")
      .select("id", { count: "exact", head: true }),
  ]);

  if (templatesResult.error) throw templatesResult.error;
  if (campaignsResult.error) throw campaignsResult.error;
  if (deliveriesResult.error) throw deliveriesResult.error;
  if (inAppCount.error) throw inAppCount.error;

  const templates: AdminEmailTemplate[] = (templatesResult.data ?? []).map(
    (row) => ({
      key: row.key,
      subject: row.subject,
      bodyHtml: row.body_html,
      updatedAt: row.updated_at,
    }),
  );

  const campaignIds = (campaignsResult.data ?? []).map((c) => c.id);
  const deliveryCountByCampaign = new Map<string, number>();

  if (campaignIds.length > 0) {
    const { data: deliveryRows, error: deliveryCountError } = await admin
      .from("platform_notification_deliveries")
      .select("campaign_id")
      .in("campaign_id", campaignIds);

    if (deliveryCountError) throw deliveryCountError;

    for (const row of deliveryRows ?? []) {
      if (!row.campaign_id) continue;
      deliveryCountByCampaign.set(
        row.campaign_id,
        (deliveryCountByCampaign.get(row.campaign_id) ?? 0) + 1,
      );
    }
  }

  const campaigns: AdminNotificationCampaign[] = (campaignsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      name: row.name,
      templateKey: row.template_key,
      status: row.status,
      createdAt: row.created_at,
      deliveryCount: deliveryCountByCampaign.get(row.id) ?? 0,
    }),
  );

  const campaignNameById = new Map(
    campaigns.map((campaign) => [campaign.id, campaign.name] as const),
  );

  const deliveries: AdminNotificationDelivery[] = (
    deliveriesResult.data ?? []
  ).map((row) => ({
    id: row.id,
    recipientEmail: row.recipient_email,
    campaignId: row.campaign_id,
    campaignName: row.campaign_id
      ? (campaignNameById.get(row.campaign_id) ?? "Ukjent kampanje")
      : "—",
    status: row.status,
    createdAt: row.created_at,
  }));

  const deliverySuccess = sentCount + deliveredCount + openedCount;

  const stats = computeNotificationStats({
    templateCount: templates.length,
    campaigns,
    deliverySuccess,
    deliveryFailed: failedCount,
    inAppDelivered: inAppCount.count ?? 0,
  });

  return {
    templates,
    campaigns,
    deliveries,
    deliveryTotal,
    deliveryFilterCounts: buildDeliveryFilterCounts({
      total: deliveryTotal,
      sent: sentCount,
      delivered: deliveredCount,
      opened: openedCount,
      failed: failedCount,
    }),
    stats,
  };
}

/** @deprecated Use fetchAdminNotificationsPageData */
export async function fetchAdminNotificationsOverview(): Promise<AdminNotificationsOverview> {
  const data = await fetchAdminNotificationsPageData();
  return {
    templates: data.templates.map((t) => ({
      key: t.key,
      subject: t.subject,
      updatedAt: t.updatedAt,
    })),
    campaigns: data.campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      createdAt: c.createdAt,
    })),
    deliveryStats: {
      sent: data.stats.deliverySuccess,
      failed: data.stats.deliveryFailed,
    },
  };
}
