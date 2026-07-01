import type { Translator, TranslationKey } from "@/i18n/types";

export type CampaignStatus = "draft" | "active" | "paused";
export type DeliveryStatus = "sent" | "delivered" | "opened" | "failed";

const CAMPAIGN_STATUS_KEYS: Record<CampaignStatus, TranslationKey> = {
  draft: "admin.notification_campaign_draft",
  active: "admin.notification_campaign_active",
  paused: "admin.notification_campaign_paused",
};

const DELIVERY_STATUS_KEYS: Record<DeliveryStatus, TranslationKey> = {
  sent: "admin.notification_delivery_sent",
  delivered: "admin.notification_delivery_delivered",
  opened: "admin.notification_delivery_opened",
  failed: "admin.notification_delivery_failed",
};

export const CAMPAIGN_SETTABLE_STATUSES: CampaignStatus[] = [
  "draft",
  "active",
  "paused",
];

export function formatCampaignStatusLabel(status: string, t: Translator): string {
  const key = CAMPAIGN_STATUS_KEYS[status as CampaignStatus];
  return key ? t(key) : status;
}

export function formatDeliveryStatusLabel(status: string, t: Translator): string {
  const key = DELIVERY_STATUS_KEYS[status as DeliveryStatus];
  return key ? t(key) : status;
}
