import { isOrganizationProfileComplete, type TenantSetupProfileFields } from "@/lib/organizations/tenant-setup";

export type SetupItemId = "organization" | "lokaler" | "team" | "contract" | "billing" | "calendar" | "portal" | "logo";

/** What we know about an organization's setup. Read on the server, scoped to the organization. */
export type SetupFacts = {
  profile: TenantSetupProfileFields;
  propertyCount: number;
  memberCount: number;
  hasContractTemplate: boolean;
  subscriptionStatus: string;
  billingExempt: boolean;
  hasCalendarFeed: boolean;
  portalEnabled: boolean;
  hasLogo: boolean;
};

export type SetupItem = { id: SetupItemId; done: boolean; href: string };

export type SetupProgress = {
  items: SetupItem[];
  doneCount: number;
  total: number;
  /** Whole percent, rounded. */
  percent: number;
  /** First step that is still open, in checklist order. */
  nextItem: SetupItem | null;
};

const BILLING_OK_STATUSES = new Set(["active", "trialing"]);

/** The setup checklist: all steps count equally; the order is the order we suggest doing them in. */
export function computeSetupProgress(facts: SetupFacts): SetupProgress {
  const items: SetupItem[] = [
    { id: "organization", done: isOrganizationProfileComplete(facts.profile), href: "/app/settings/organization" },
    { id: "lokaler", done: facts.propertyCount >= 1, href: "/app/settings/lokaler" },
    { id: "team", done: facts.memberCount >= 2, href: "/app/settings/team" },
    { id: "contract", done: facts.hasContractTemplate, href: "/app/settings/kontrakter" },
    { id: "billing", done: facts.billingExempt || BILLING_OK_STATUSES.has(facts.subscriptionStatus), href: "/app/settings/billing" },
    { id: "calendar", done: facts.hasCalendarFeed, href: "/app/settings/integrations" },
    { id: "portal", done: facts.portalEnabled, href: "/app/settings/kontrakter" },
    { id: "logo", done: facts.hasLogo, href: "/app/settings/organization" },
  ];
  const doneCount = items.filter((item) => item.done).length;
  return {
    items,
    doneCount,
    total: items.length,
    percent: Math.round((doneCount / items.length) * 100),
    nextItem: items.find((item) => !item.done) ?? null,
  };
}
