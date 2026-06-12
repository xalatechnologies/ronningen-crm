import type { NotificationCategory } from "@/lib/notifications/notification-events";

export type UserNotificationRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  organization_id: string | null;
  action_url: string | null;
  action_label: string | null;
  read_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
};

export type UserNotificationFilter = "all" | "unread";

export function matchesOrgScope(
  notification: Pick<UserNotificationRow, "organization_id">,
  currentOrganizationId: string | null,
): boolean {
  if (!notification.organization_id) return true;
  if (!currentOrganizationId) return false;
  return notification.organization_id === currentOrganizationId;
}

export function filterNotificationsForOrg(
  notifications: UserNotificationRow[],
  currentOrganizationId: string | null,
): UserNotificationRow[] {
  return notifications.filter((n) => matchesOrgScope(n, currentOrganizationId));
}

export function countUnread(
  notifications: UserNotificationRow[],
  currentOrganizationId: string | null,
): number {
  return filterNotificationsForOrg(notifications, currentOrganizationId).filter(
    (n) => !n.read_at,
  ).length;
}

export function filterByReadState(
  notifications: UserNotificationRow[],
  filter: UserNotificationFilter,
): UserNotificationRow[] {
  if (filter === "unread") {
    return notifications.filter((n) => !n.read_at);
  }
  return notifications;
}

export function filterByCategory(
  notifications: UserNotificationRow[],
  category: NotificationCategory | "all",
): UserNotificationRow[] {
  if (category === "all") return notifications;
  return notifications.filter((n) => n.category === category);
}

export function needsPopup(notification: UserNotificationRow): boolean {
  if (notification.acknowledged_at) return false;
  if (notification.priority === "low") return false;
  return true;
}
