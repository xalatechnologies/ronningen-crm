import type {
  AdminEmailTemplate,
  AdminNotificationCampaign,
  AdminNotificationDelivery,
} from "@/lib/admin/queries/notifications";
import type { Translator, TranslationKey } from "@/i18n/types";

export type AdminNotificationView = "templates" | "campaigns" | "deliveries";

export type AdminCampaignFilter = "all" | "draft" | "active" | "paused";

export type AdminDeliveryFilter =
  | "all"
  | "sent"
  | "delivered"
  | "opened"
  | "failed";

const VIEW_LABEL_KEYS: Record<AdminNotificationView, TranslationKey> = {
  templates: "admin.notification_view_templates",
  campaigns: "admin.notification_view_campaigns",
  deliveries: "admin.notification_view_deliveries",
};

const CAMPAIGN_FILTER_KEYS: Record<AdminCampaignFilter, TranslationKey> = {
  all: "admin.alle",
  draft: "admin.notification_campaign_draft",
  active: "admin.notification_campaign_active",
  paused: "admin.notification_campaign_paused",
};

const DELIVERY_FILTER_KEYS: Record<AdminDeliveryFilter, TranslationKey> = {
  all: "admin.alle",
  sent: "admin.notification_delivery_sent",
  delivered: "admin.notification_delivery_delivered",
  opened: "admin.notification_delivery_opened",
  failed: "admin.notification_delivery_failed",
};

export function adminNotificationViewOptions(t: Translator) {
  return (["templates", "campaigns", "deliveries"] as const).map((value) => ({
    value,
    label: t(VIEW_LABEL_KEYS[value]),
  }));
}

export function adminCampaignFilterOptions(t: Translator) {
  return (["all", "draft", "active", "paused"] as const).map((value) => ({
    value,
    label: t(CAMPAIGN_FILTER_KEYS[value]),
  }));
}

export function adminDeliveryFilterOptions(t: Translator) {
  return (
    ["all", "sent", "delivered", "opened", "failed"] as const
  ).map((value) => ({
    value,
    label: t(DELIVERY_FILTER_KEYS[value]),
  }));
}

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
