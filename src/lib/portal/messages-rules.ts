export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGES_PER_MINUTE = 10;
export const CUSTOMER_EMAIL_THROTTLE_MINUTES = 15;

export type PortalMessage = {
  id: string;
  senderKind: "customer" | "staff";
  senderName: string;
  body: string;
  createdAt: string;
  readByCustomerAt: string | null;
  readByStaffAt: string | null;
};

/** Trims and bounds a message; null when it is empty or too long. */
export function normalizeMessageBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (body.length === 0 || body.length > MESSAGE_MAX_LENGTH) return null;
  return body;
}

export function isRateLimited(sentInLastMinute: number): boolean {
  return sentInLastMinute >= MESSAGES_PER_MINUTE;
}

/** One notification e-mail per booking per 15 minutes, so a chatty thread does not spam the customer. */
export function shouldEmailCustomer(lastEmailedAt: string | null, now: Date = new Date()): boolean {
  if (!lastEmailedAt) return true;
  return now.getTime() - new Date(lastEmailedAt).getTime() >= CUSTOMER_EMAIL_THROTTLE_MINUTES * 60_000;
}

/** Notifications dedupe on context_key, so key on the oldest unread customer message: one per unread streak. */
export function staffNotificationContextKey(bookingId: string, oldestUnreadMessageId: string): string {
  return `portal_message:${bookingId}:${oldestUnreadMessageId}`;
}
