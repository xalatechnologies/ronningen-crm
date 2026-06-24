import {
  tenantQueryKeys,
  tenantStaleTimes,
} from "@/lib/queries/tenant-query-keys";

export { tenantQueryKeys, tenantStaleTimes };

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    session: () => ["auth", "session"] as const,
    profile: (userId: string) => ["auth", "profile", userId] as const,
    platformAdmin: (userId: string | undefined) =>
      ["auth", "platform-admin", userId] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    memberships: (userId: string) =>
      ["organizations", "memberships", userId] as const,
    active: (userId: string) => ["organizations", "active", userId] as const,
    detail: (orgId: string) => ["organizations", "detail", orgId] as const,
  },
  bookings: {
    all: ["tenant", "bookings"] as const,
    list: (orgId: string, role: string | null) =>
      tenantQueryKeys.bookings(orgId, role),
    detail: (orgId: string, bookingId: string) =>
      ["tenant", "bookings", orgId, "detail", bookingId] as const,
  },
  inquiries: {
    all: ["tenant", "inquiries"] as const,
    list: (orgId: string, role: string | null) =>
      tenantQueryKeys.inquiries(orgId, role),
  },
  customers: {
    all: ["tenant", "customers"] as const,
    list: (orgId: string) => tenantQueryKeys.customers(orgId),
    detail: (orgId: string, customerId: string) =>
      ["tenant", "customers", orgId, "detail", customerId] as const,
  },
  finance: {
    all: ["tenant", "finance"] as const,
    list: (orgId: string, role: string | null) =>
      tenantQueryKeys.finance(orgId, role),
  },
  invoices: {
    all: ["tenant", "invoices"] as const,
    list: (orgId: string, role: string | null) =>
      tenantQueryKeys.invoices(orgId, role),
  },
  assets: {
    all: ["tenant", "assets"] as const,
    list: (orgId: string, role: string | null) =>
      tenantQueryKeys.assets(orgId, role),
  },
  reports: {
    all: ["tenant", "reports"] as const,
    monthly: (orgId: string, year: number, month: number | null) =>
      tenantQueryKeys.reports(orgId, year, month),
  },
  admin: {
    all: ["admin"] as const,
    dashboard: () => ["admin", "dashboard"] as const,
    organizations: (filters?: Record<string, unknown>) =>
      ["admin", "organizations", filters ?? {}] as const,
    users: (filters?: Record<string, unknown>) =>
      ["admin", "users", filters ?? {}] as const,
    subscriptions: (filters?: Record<string, unknown>) =>
      ["admin", "subscriptions", filters ?? {}] as const,
    audit: (filters?: Record<string, unknown>) =>
      ["admin", "audit", filters ?? {}] as const,
  },
  billing: {
    all: ["billing"] as const,
    subscription: (orgId: string) => ["billing", "subscription", orgId] as const,
    portal: (orgId: string) => ["billing", "portal", orgId] as const,
  },
} as const;
