export type NotificationCategory =
  | "platform"
  | "billing"
  | "booking"
  | "inquiry"
  | "team"
  | "support"
  | "accommodation";

export type NotificationPriority = "low" | "normal" | "high";

export type NotificationEventKey =
  | "platform.welcome"
  | "platform.campaign"
  | "billing.trial_reminder"
  | "billing.payment_failed"
  | "billing.access_suspended"
  | "support.ticket_reply"
  | "booking.created"
  | "inquiry.created"
  | "accommodation.created"
  | "team.member_added";

type EventDefaults = {
  category: NotificationCategory;
  priority: NotificationPriority;
};

const EVENT_DEFAULTS: Record<NotificationEventKey, EventDefaults> = {
  "platform.welcome": { category: "platform", priority: "normal" },
  "platform.campaign": { category: "platform", priority: "high" },
  "billing.trial_reminder": { category: "billing", priority: "normal" },
  "billing.payment_failed": { category: "billing", priority: "high" },
  "billing.access_suspended": { category: "billing", priority: "high" },
  "support.ticket_reply": { category: "support", priority: "normal" },
  "booking.created": { category: "booking", priority: "normal" },
  "inquiry.created": { category: "inquiry", priority: "normal" },
  "accommodation.created": { category: "accommodation", priority: "normal" },
  "team.member_added": { category: "team", priority: "normal" },
};

export function resolveEventDefaults(
  eventKey: NotificationEventKey | string,
): EventDefaults | null {
  return EVENT_DEFAULTS[eventKey as NotificationEventKey] ?? null;
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  platform: "Plattform",
  billing: "Abonnement",
  booking: "Reservasjon",
  inquiry: "Forespørsel",
  team: "Team",
  support: "Support",
  accommodation: "Overnatting",
};

export function formatNotificationCategory(category: string): string {
  return NOTIFICATION_CATEGORY_LABELS[category as NotificationCategory] ?? category;
}

export function buildBookingActionUrl(bookingId: string): string {
  return `/app/bookings?booking=${bookingId}`;
}

export function buildInquiryActionUrl(inquiryId: string): string {
  return `/app/inquiries?inquiry=${inquiryId}`;
}

export function buildAccommodationActionUrl(reservationId: string): string {
  return `/app/overnatting?reservation=${reservationId}`;
}

export function buildSupportActionUrl(): string {
  return "/app/settings/support";
}

export function buildBillingActionUrl(): string {
  return "/app/settings/billing";
}

export function buildTeamActionUrl(): string {
  return "/app/settings/team";
}
