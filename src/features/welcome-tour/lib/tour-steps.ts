import type { UserRole } from "@/constants/roles";
import { SETTINGS_SECTIONS } from "@/lib/settings/settings-links";

export type TourIconName = "welcome" | "organization" | "venue" | "bookings" | "pricing" | "customers" | "contracts" | "invoices" | "team" | "account" | "help";

export type TourStepKey = "welcome" | "company" | "venue" | "bookings" | "pricing" | "customers" | "contracts" | "invoices" | "team" | "account" | "help";

export type TourStep = {
  /** Text lives in the dictionaries under tips.<key>.t (title) and tips.<key>.b (body). */
  key: TourStepKey;
  icon: TourIconName;
  /** Page the step belongs to; the tour goes there when the user lands on the step. */
  route?: string;
  /** CSS selectors for what the step points at; the first one that is visible on screen wins. */
  targets: string[];
  /** Side-bar items put the card to the right of them. */
  placement?: "right" | "auto";
  /** Settings section that must be visible to the person, or the step is left out. */
  requiresSettings?: string;
};

const tour = (name: string) => `[data-tour="${name}"]`;

/** The tour as data. Order is the order shown; steps the person cannot use are filtered out by getTourSteps. */
export const TOUR_STEPS: readonly TourStep[] = [
  { key: "welcome", icon: "welcome", route: "/app/dashboard", targets: [] },
  { key: "company", icon: "organization", route: "/app/settings/organization", targets: [tour("settings-organization")], placement: "right", requiresSettings: "organization" },
  { key: "venue", icon: "venue", route: "/app/settings/lokaler", targets: [tour("add-building"), tour("settings-lokaler")] },
  { key: "bookings", icon: "bookings", route: "/app/bookings", targets: [tour("nav-bookings")], placement: "right" },
  { key: "pricing", icon: "pricing", route: "/app/pricing", targets: [tour("nav-pricing")], placement: "right" },
  { key: "customers", icon: "customers", route: "/app/customers", targets: [tour("nav-customers")], placement: "right" },
  { key: "contracts", icon: "contracts", route: "/app/settings/kontrakter", targets: [tour("settings-contracts")], placement: "right", requiresSettings: "contracts" },
  { key: "invoices", icon: "invoices", route: "/app/invoices", targets: [tour("nav-invoices")], placement: "right" },
  { key: "team", icon: "team", route: "/app/settings/team", targets: [tour("settings-team")], placement: "right", requiresSettings: "team" },
  { key: "account", icon: "account", route: "/app/settings/account", targets: [tour("settings-account")], placement: "right", requiresSettings: "account" },
  { key: "help", icon: "help", targets: [tour("show-tips")] },
];

/**
 * The steps this person can use. A step that needs a settings section is only included when that section
 * is visible to the person's role, so nobody is shown something they cannot open.
 */
export function getTourSteps(role: UserRole | null): TourStep[] {
  const sectionVisible = (id: string) => SETTINGS_SECTIONS.find((s) => s.id === id)?.visible(role) ?? false;
  return TOUR_STEPS.filter((step) => !step.requiresSettings || sectionVisible(step.requiresSettings));
}
