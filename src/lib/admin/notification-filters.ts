import type {
  AdminEmailTemplate,
  AdminNotificationCampaign,
  AdminNotificationDelivery,
} from "@/lib/admin/queries/notifications";

export type AdminNotificationView = "templates" | "campaigns" | "deliveries";

export type AdminCampaignFilter = "all" | "draft" | "active" | "paused";

export type AdminDeliveryFilter =
  | "all"
  | "sent"
  | "delivered"
  | "opened"
  | "failed";

export const ADMIN_NOTIFICATION_VIEW_OPTIONS: {
  value: AdminNotificationView;
  label: string;
}[] = [
  { value: "templates", label: "Maler" },
  { value: "campaigns", label: "Kampanjer" },
  { value: "deliveries", label: "Leveringer" },
];

export const ADMIN_CAMPAIGN_FILTER_OPTIONS: {
  value: AdminCampaignFilter;
  label: string;
}[] = [
  { value: "all", label: "Alle" },
  { value: "draft", label: "Utkast" },
  { value: "active", label: "Aktiv" },
  { value: "paused", label: "Pauset" },
];

export const ADMIN_DELIVERY_FILTER_OPTIONS: {
  value: AdminDeliveryFilter;
  label: string;
}[] = [
  { value: "all", label: "Alle" },
  { value: "sent", label: "Sendt" },
  { value: "delivered", label: "Levert" },
  { value: "opened", label: "Åpnet" },
  { value: "failed", label: "Feilet" },
];

export type AdminNotificationOverviewStats = {
  templateCount: number;
  activeCampaigns: number;
  deliverySuccess: number;
  deliveryFailed: number;
  inAppDelivered: number;
};

export function computeNotificationViewCounts(input: {
  templates: AdminEmailTemplate[];
  campaigns: AdminNotificationCampaign[];
  deliveryTotal: number;
}): Record<AdminNotificationView, number> {
  return {
    templates: input.templates.length,
    campaigns: input.campaigns.length,
    deliveries: input.deliveryTotal,
  };
}

export function computeNotificationStats(input: {
  templateCount: number;
  campaigns: AdminNotificationCampaign[];
  deliverySuccess: number;
  deliveryFailed: number;
  inAppDelivered: number;
}): AdminNotificationOverviewStats {
  return {
    templateCount: input.templateCount,
    activeCampaigns: input.campaigns.filter((c) => c.status === "active").length,
    deliverySuccess: input.deliverySuccess,
    deliveryFailed: input.deliveryFailed,
    inAppDelivered: input.inAppDelivered,
  };
}

export function matchesTemplateSearch(
  template: AdminEmailTemplate,
  q?: string,
): boolean {
  const needle = q?.trim().toLowerCase();
  if (!needle) return true;
  return (
    template.key.toLowerCase().includes(needle) ||
    template.subject.toLowerCase().includes(needle)
  );
}

export function matchesCampaignFilter(
  campaign: AdminNotificationCampaign,
  filter: AdminCampaignFilter,
  q?: string,
): boolean {
  const needle = q?.trim().toLowerCase();
  if (needle) {
    const matchesSearch =
      campaign.name.toLowerCase().includes(needle) ||
      (campaign.templateKey?.toLowerCase().includes(needle) ?? false);
    if (!matchesSearch) return false;
  }

  if (filter === "all") return true;
  return campaign.status === filter;
}

export function matchesDeliveryFilter(
  delivery: AdminNotificationDelivery,
  filter: AdminDeliveryFilter,
  q?: string,
): boolean {
  const needle = q?.trim().toLowerCase();
  if (needle) {
    const matchesSearch =
      delivery.recipientEmail.toLowerCase().includes(needle) ||
      delivery.campaignName.toLowerCase().includes(needle);
    if (!matchesSearch) return false;
  }

  if (filter === "all") return true;
  return delivery.status === filter;
}

export function computeCampaignFilterCounts(
  campaigns: AdminNotificationCampaign[],
): Record<AdminCampaignFilter, number> {
  const counts: Record<AdminCampaignFilter, number> = {
    all: campaigns.length,
    draft: 0,
    active: 0,
    paused: 0,
  };

  for (const campaign of campaigns) {
    if (campaign.status === "draft") counts.draft += 1;
    if (campaign.status === "active") counts.active += 1;
    if (campaign.status === "paused") counts.paused += 1;
  }

  return counts;
}

export function buildDeliveryFilterCounts(input: {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
}): Record<AdminDeliveryFilter, number> {
  return {
    all: input.total,
    sent: input.sent,
    delivered: input.delivered,
    opened: input.opened,
    failed: input.failed,
  };
}
