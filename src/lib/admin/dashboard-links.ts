import type { AdminAuditCategory } from "@/lib/admin/audit-categories";
import { adminRoutes } from "@/config/admin-routes";

export type { AdminAuditCategory };

export type AdminSubscriptionFilter =
  | "all"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "suspended";

export type AdminOrgFilter =
  | "all"
  | "active"
  | "incomplete"
  | "suspended"
  | "past_due"
  | "canceled"
  | "enterprise";

export type AdminUserFilter = "all" | "platform_admin" | "no_org" | "inactive";

export type AdminSupportFilter = "all" | "open" | "waiting" | "resolved";

export type AdminFeatureFlagFilter =
  | "all"
  | "active"
  | "rollout"
  | "off"
  | "scheduled";

export type AdminNotificationView = "templates" | "campaigns" | "deliveries";

export type AdminNotificationFilter =
  | "all"
  | "draft"
  | "active"
  | "paused"
  | "sent"
  | "delivered"
  | "opened"
  | "failed";

export function adminSubscriptionsHref(
  filter?: AdminSubscriptionFilter,
): string {
  if (!filter || filter === "all") return adminRoutes.subscriptions;
  return `${adminRoutes.subscriptions}?filter=${filter}`;
}

export function adminOrganizationsHref(
  params?: { status?: AdminOrgFilter; q?: string },
): string {
  const search = new URLSearchParams();
  if (params?.status && params.status !== "all") {
    search.set("status", params.status);
  }
  if (params?.q?.trim()) {
    search.set("q", params.q.trim());
  }
  const qs = search.toString();
  return qs ? `${adminRoutes.organizations}?${qs}` : adminRoutes.organizations;
}

export function adminUsersHref(filter?: AdminUserFilter): string {
  if (!filter || filter === "all") return adminRoutes.users;
  return `${adminRoutes.users}?filter=${filter}`;
}

export function adminSupportHref(
  filter?: AdminSupportFilter,
  q?: string,
): string {
  const params = new URLSearchParams();
  if (filter && filter !== "all") params.set("filter", filter);
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return qs ? `${adminRoutes.support}?${qs}` : adminRoutes.support;
}

export function adminNotificationsHref(params?: {
  view?: AdminNotificationView;
  filter?: AdminNotificationFilter;
  q?: string;
}): string {
  const search = new URLSearchParams();
  if (params?.view && params.view !== "templates") {
    search.set("view", params.view);
  }
  if (params?.filter && params.filter !== "all") {
    search.set("filter", params.filter);
  }
  if (params?.q?.trim()) search.set("q", params.q.trim());
  const qs = search.toString();
  return qs
    ? `${adminRoutes.notifications}?${qs}`
    : adminRoutes.notifications;
}

export function adminFeatureFlagsHref(params?: {
  filter?: AdminFeatureFlagFilter;
  q?: string;
}): string {
  const search = new URLSearchParams();
  if (params?.filter && params.filter !== "all") {
    search.set("filter", params.filter);
  }
  if (params?.q?.trim()) search.set("q", params.q.trim());
  const qs = search.toString();
  return qs
    ? `${adminRoutes.featureFlags}?${qs}`
    : adminRoutes.featureFlags;
}

export function adminAuditHref(params?: {
  category?: AdminAuditCategory;
  q?: string;
  action?: string;
  from?: string;
  to?: string;
}): string {
  const search = new URLSearchParams();
  if (params?.category && params.category !== "all") {
    search.set("category", params.category);
  }
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.action?.trim()) search.set("action", params.action.trim());
  if (params?.from?.trim()) search.set("from", params.from.trim());
  if (params?.to?.trim()) search.set("to", params.to.trim());
  const qs = search.toString();
  return qs ? `${adminRoutes.audit}?${qs}` : adminRoutes.audit;
}

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function adminAuditLast7DaysHref(): string {
  return adminAuditHref({
    from: isoDateDaysAgo(7),
    to: todayIsoDate(),
  });
}

export function subscriptionFilterForStatus(
  status: string,
): AdminSubscriptionFilter | null {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "canceled"
  ) {
    return status;
  }
  return null;
}

export function orgFilterForStatus(status: string): AdminOrgFilter | null {
  if (
    status === "active" ||
    status === "past_due" ||
    status === "canceled"
  ) {
    return status;
  }
  if (status === "trialing") return "active";
  return null;
}
