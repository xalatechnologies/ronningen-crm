export type CampaignStatus = "draft" | "active" | "paused";
export type DeliveryStatus = "sent" | "delivered" | "opened" | "failed";

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Utkast",
  active: "Aktiv",
  paused: "Pauset",
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  sent: "Sendt",
  delivered: "Levert",
  opened: "Åpnet",
  failed: "Feilet",
};

export const CAMPAIGN_SETTABLE_STATUSES: CampaignStatus[] = [
  "draft",
  "active",
  "paused",
];

export function formatCampaignStatusLabel(status: string): string {
  return CAMPAIGN_STATUS_LABELS[status as CampaignStatus] ?? status;
}

export function formatDeliveryStatusLabel(status: string): string {
  return DELIVERY_STATUS_LABELS[status as DeliveryStatus] ?? status;
}
