import type { SubscriptionPlan, SubscriptionStatus, UserRole } from "@/constants/roles";

export const ACTIVE_ORGANIZATION_STORAGE_KEY = "venue-manager-active-org";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
};

export type OrganizationMembership = {
  organizationId: string;
  role: UserRole;
  organization: OrganizationSummary;
};

export type OrganizationContextValue = {
  organizations: OrganizationMembership[];
  currentOrganization: OrganizationSummary | null;
  currentOrganizationId: string | null;
  currentRole: UserRole | null;
  loading: boolean;
  error: string | null;
  setCurrentOrganizationId: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
};
