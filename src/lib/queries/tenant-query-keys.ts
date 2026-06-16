export const tenantQueryKeys = {
  all: ["tenant"] as const,
  dashboard: (orgId: string) => ["tenant", "dashboard", orgId] as const,
  bookings: (orgId: string) => ["tenant", "bookings", orgId] as const,
  inquiries: (orgId: string) => ["tenant", "inquiries", orgId] as const,
  customers: (orgId: string) => ["tenant", "customers", orgId] as const,
  finance: (orgId: string) => ["tenant", "finance", orgId] as const,
  pricing: (orgId: string) => ["tenant", "pricing", orgId] as const,
  invoices: (orgId: string) => ["tenant", "invoices", orgId] as const,
  assets: (orgId: string) => ["tenant", "assets", orgId] as const,
  overnatting: (orgId: string, ym: string) =>
    ["tenant", "overnatting", orgId, ym] as const,
  reports: (orgId: string, year: number, month: number | null) =>
    ["tenant", "reports", orgId, year, month] as const,
};

export const tenantStaleTimes = {
  list: 60_000,
  dashboard: 45_000,
  finance: 30_000,
  reports: 30_000,
} as const;
