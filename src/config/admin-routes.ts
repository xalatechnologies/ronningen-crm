export const ADMIN_ROUTE_PREFIX = "/admin";

export const adminRoutes = {
  overview: "/admin",
  organizations: "/admin/organizations",
  organizationDetail: (id: string) => `/admin/organizations/${id}`,
  subscriptions: "/admin/subscriptions",
  /** @deprecated use subscriptions */
  billing: "/admin/billing",
  users: "/admin/users",
  userDetail: (id: string) => `/admin/users/${id}`,
  revenue: "/admin/revenue",
  support: "/admin/support",
  systemHealth: "/admin/system-health",
  audit: "/admin/audit",
  featureFlags: "/admin/feature-flags",
  notifications: "/admin/notifications",
  settings: "/admin/settings",
  search: "/admin/search",
} as const;

export const adminNavigation = [
  { href: adminRoutes.overview, label: "Dashboard", segment: "overview" },
  {
    href: adminRoutes.organizations,
    label: "Organisasjoner",
    segment: "organizations",
  },
  {
    href: adminRoutes.subscriptions,
    label: "Abonnement",
    segment: "subscriptions",
  },
  { href: adminRoutes.users, label: "Brukere", segment: "users" },
  { href: adminRoutes.revenue, label: "Inntekt", segment: "revenue" },
  { href: adminRoutes.support, label: "Support", segment: "support" },
  {
    href: adminRoutes.systemHealth,
    label: "Systemhelse",
    segment: "system-health",
  },
  { href: adminRoutes.audit, label: "Revisjonslogg", segment: "audit" },
  {
    href: adminRoutes.featureFlags,
    label: "Funksjonsflagg",
    segment: "feature-flags",
  },
  {
    href: adminRoutes.notifications,
    label: "Varsler",
    segment: "notifications",
  },
  { href: adminRoutes.settings, label: "Innstillinger", segment: "settings" },
] as const;

export type AdminNavItem = (typeof adminNavigation)[number];

export const adminNavigationGroups: {
  label: string;
  items: AdminNavItem[];
}[] = [
  {
    label: "Drift",
    items: [
      adminNavigation[0],
      adminNavigation[1],
      adminNavigation[2],
      adminNavigation[3],
    ],
  },
  {
    label: "Forretning",
    items: [adminNavigation[4], adminNavigation[5]],
  },
  {
    label: "Plattform",
    items: [
      adminNavigation[6],
      adminNavigation[7],
      adminNavigation[8],
      adminNavigation[9],
      adminNavigation[10],
    ],
  },
];

export const PLATFORM_ADMIN_EMAIL = "admin@eventmanager.no";
