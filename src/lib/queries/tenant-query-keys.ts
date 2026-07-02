export const tenantQueryKeys = {
  all: ["tenant"] as const,
  dashboard: (orgId: string) => ["tenant", "dashboard", orgId] as const,
  bookings: (orgId: string, role: string | null) =>
    ["tenant", "bookings", orgId, role] as const,
  inquiries: (orgId: string, role: string | null) =>
    ["tenant", "inquiries", orgId, role] as const,
  customers: (orgId: string) => ["tenant", "customers", orgId] as const,
  finance: (orgId: string, role: string | null) =>
    ["tenant", "finance", orgId, role] as const,
  pricing: (orgId: string) => ["tenant", "pricing", orgId] as const,
  invoices: (orgId: string, role: string | null) =>
    ["tenant", "invoices", orgId, role] as const,
  assets: (orgId: string, role: string | null) =>
    ["tenant", "assets", orgId, role] as const,
  overnatting: (orgId: string, ym: string, role: string | null) =>
    ["tenant", "overnatting", orgId, ym, role] as const,
  reports: (orgId: string, year: number | "all", month: number | null) =>
    ["tenant", "reports", orgId, year, month] as const,
};

export const tenantStaleTimes = {
  list: 60_000,
  dashboard: 45_000,
  finance: 30_000,
  reports: 30_000,
} as const;
