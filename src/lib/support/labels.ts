export type SupportTicketStatus = "open" | "waiting" | "resolved";

export type SupportTicketCategory =
  | "bug"
  | "billing"
  | "access"
  | "feature"
  | "other";

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "Åpen",
  waiting: "Venter",
  resolved: "Løst",
};

export const SUPPORT_STATUS_DESCRIPTIONS: Record<SupportTicketStatus, string> = {
  open: "Saken er mottatt og under behandling.",
  waiting: "Vi venter på svar fra deg.",
  resolved: "Saken er lukket.",
};

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  bug: "Feil",
  billing: "Fakturering",
  access: "Tilgang",
  feature: "Ønske",
  other: "Annet",
};

export const SUPPORT_SETTABLE_STATUSES: SupportTicketStatus[] = [
  "open",
  "waiting",
  "resolved",
];

export const SUPPORT_TICKET_CATEGORIES: SupportTicketCategory[] = [
  "bug",
  "billing",
  "access",
  "feature",
  "other",
];

export function isSupportTicketStatus(
  value: string,
): value is SupportTicketStatus {
  return value === "open" || value === "waiting" || value === "resolved";
}

export function isSupportTicketCategory(
  value: string,
): value is SupportTicketCategory {
  return (
    value === "bug" ||
    value === "billing" ||
    value === "access" ||
    value === "feature" ||
    value === "other"
  );
}
