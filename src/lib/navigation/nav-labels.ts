import type { TranslationKey } from "@/i18n/types";
import type { Translator } from "@/i18n/types";

const appNavSegments: Record<string, TranslationKey> = {
  dashboard: "navigation.dashboard",
  inquiries: "navigation.inquiries",
  bookings: "navigation.bookings",
  overnatting: "navigation.overnatting",
  customers: "navigation.customers",
  partners: "navigation.partners",
  pricing: "navigation.pricing",
  finance: "navigation.finance",
  invoices: "navigation.invoices",
  assets: "navigation.assets",
  reports: "navigation.reports",
  settings: "navigation.settings",
};

const adminNavSegments: Record<string, TranslationKey> = {
  overview: "adminNav.overview",
  organizations: "adminNav.organizations",
  subscriptions: "adminNav.subscriptions",
  users: "adminNav.users",
  revenue: "adminNav.revenue",
  support: "adminNav.support",
  "system-health": "adminNav.systemHealth",
  audit: "adminNav.audit",
  "feature-flags": "adminNav.featureFlags",
  notifications: "adminNav.notifications",
  settings: "adminNav.settings",
};

const settingsSectionKeys: Record<string, { title: TranslationKey; description: TranslationKey }> = {
  overview: {
    title: "settingsNav.overview.title",
    description: "settingsNav.overview.description",
  },
  organization: {
    title: "settingsNav.organization.title",
    description: "settingsNav.organization.description",
  },
  lokaler: {
    title: "settingsNav.lokaler.title",
    description: "settingsNav.lokaler.description",
  },
  team: {
    title: "settingsNav.team.title",
    description: "settingsNav.team.description",
  },
  billing: {
    title: "settingsNav.billing.title",
    description: "settingsNav.billing.description",
  },
  support: {
    title: "settingsNav.support.title",
    description: "settingsNav.support.description",
  },
  account: {
    title: "settingsNav.account.title",
    description: "settingsNav.account.description",
  },
};

export function appNavLabel(segment: string, t: Translator): string {
  const key = appNavSegments[segment];
  return key ? t(key) : segment;
}

const adminGroupKeys: Record<string, TranslationKey> = {
  Drift: "adminNav.groups.operations",
  Forretning: "adminNav.groups.business",
  Plattform: "adminNav.groups.platform",
  Operations: "adminNav.groups.operations",
  Business: "adminNav.groups.business",
  Platform: "adminNav.groups.platform",
};

export function adminNavGroupLabel(label: string, t: Translator): string {
  const key = adminGroupKeys[label];
  return key ? t(key) : label;
}

export function adminNavLabel(segment: string, t: Translator): string {
  const key = adminNavSegments[segment];
  return key ? t(key) : segment;
}

export function settingsSectionTitle(id: string, t: Translator): string {
  const keys = settingsSectionKeys[id];
  return keys ? t(keys.title) : id;
}

export function settingsSectionDescription(id: string, t: Translator): string {
  const keys = settingsSectionKeys[id];
  return keys ? t(keys.description) : "";
}

export function roleLabel(
  role: string,
  t: Translator,
): string {
  const key = `roles.${role}` as TranslationKey;
  const value = t(key);
  return value === key ? role : value;
}

export function statusLabel(
  status: string,
  t: Translator,
): string {
  const camel = status.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const key = `statuses.${camel}` as TranslationKey;
  const value = t(key);
  return value === key ? status : value;
}
