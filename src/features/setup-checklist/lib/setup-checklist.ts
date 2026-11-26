import { isOrganizationProfileComplete, type TenantSetupProfileFields } from "@/lib/organizations/tenant-setup";

/** What the organization has done so far. Plain facts, read from the database elsewhere. */
export type SetupFacts = {
  profile: TenantSetupProfileFields & {
    bank_account: string | null;
    payment_instructions: string | null;
  };
  propertyCount: number;
  /** Active packages plus active services. */
  priceCount: number;
  memberCount: number;
  invitationCount: number;
  inquiryCount: number;
  bookingCount: number;
  /** A paid (Stripe) subscription exists. */
  hasSubscription: boolean;
};

export const SETUP_STEP_IDS = ["organization", "details", "venue", "pricing", "payment", "team", "firstBooking", "subscription"] as const;
export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

export type SetupStep = {
  id: SetupStepId;
  done: boolean;
  /** Where the user goes to do the step. */
  href: string;
};

export type SetupChecklist = {
  steps: SetupStep[];
  doneCount: number;
  total: number;
  /** Whole percent, 0 to 100. */
  percent: number;
  complete: boolean;
  /** The first step that is not done, or null when everything is done. */
  nextId: SetupStepId | null;
};

const STEP_HREFS: Record<SetupStepId, string> = {
  organization: "/app/settings/organization",
  details: "/app/settings/organization",
  venue: "/app/settings/lokaler",
  pricing: "/app/pricing",
  payment: "/app/settings/organization",
  team: "/app/settings/team",
  firstBooking: "/app/inquiries/new",
  subscription: "/app/settings/billing",
};

const filled = (value: string | null | undefined) => Boolean(value?.trim());

/**
 * Builds the getting-started checklist. Every step counts the same, so the percent is done steps over all steps.
 * The subscription step only exists when billing is switched on.
 */
export function buildSetupChecklist(facts: SetupFacts, options: { billingEnabled: boolean }): SetupChecklist {
  const done: Record<SetupStepId, boolean> = {
    organization: true, // The page only exists once the organization has been created.
    details: isOrganizationProfileComplete(facts.profile),
    venue: facts.propertyCount > 0,
    pricing: facts.priceCount > 0,
    payment: filled(facts.profile.bank_account) || filled(facts.profile.payment_instructions),
    team: facts.memberCount > 1 || facts.invitationCount > 0,
    firstBooking: facts.inquiryCount > 0 || facts.bookingCount > 0,
    subscription: facts.hasSubscription,
  };

  const ids = SETUP_STEP_IDS.filter((id) => id !== "subscription" || options.billingEnabled);
  const steps = ids.map((id) => ({ id, done: done[id], href: STEP_HREFS[id] }));
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;

  return {
    steps,
    doneCount,
    total,
    percent: Math.round((doneCount / total) * 100),
    complete: doneCount === total,
    nextId: steps.find((s) => !s.done)?.id ?? null,
  };
}
