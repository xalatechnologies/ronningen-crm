import { describe, expect, it } from "vitest";

import { computeSetupProgress, type SetupFacts } from "@/features/settings/lib/setup-progress";

const complete: SetupFacts = {
  profile: { org_number: "123456789", address_line1: "Gata 1", city: "Oslo", contact_email: "post@lokale.no", contact_phone: null },
  propertyCount: 2,
  memberCount: 3,
  hasContractTemplate: true,
  subscriptionStatus: "active",
  billingExempt: false,
  hasCalendarFeed: true,
  portalEnabled: true,
  hasLogo: true,
};

const empty: SetupFacts = {
  profile: { org_number: null, address_line1: null, city: null, contact_email: null, contact_phone: null },
  propertyCount: 0,
  memberCount: 1,
  hasContractTemplate: false,
  subscriptionStatus: "incomplete",
  billingExempt: false,
  hasCalendarFeed: false,
  portalEnabled: false,
  hasLogo: false,
};

const byId = (facts: SetupFacts) => Object.fromEntries(computeSetupProgress(facts).items.map((i) => [i.id, i.done]));

describe("computeSetupProgress", () => {
  it("is 100 % when everything is set up and has no next step", () => {
    const progress = computeSetupProgress(complete);
    expect(progress).toMatchObject({ doneCount: 8, total: 8, percent: 100, nextItem: null });
  });

  it("is 0 % for a brand-new organization and points at the first open step", () => {
    const progress = computeSetupProgress(empty);
    expect(progress).toMatchObject({ doneCount: 0, total: 8, percent: 0 });
    expect(progress.nextItem?.id).toBe("organization");
  });

  it("rounds the percentage (5 of 8 is 63 %)", () => {
    const progress = computeSetupProgress({ ...complete, hasContractTemplate: false, hasCalendarFeed: false, hasLogo: false });
    expect(progress.doneCount).toBe(5);
    expect(progress.percent).toBe(63);
  });

  it("organization needs org number, an address and a contact", () => {
    expect(byId({ ...complete, profile: { ...complete.profile, org_number: " " } }).organization).toBe(false);
    expect(byId({ ...complete, profile: { ...complete.profile, city: null } }).organization).toBe(false);
    expect(byId({ ...complete, profile: { ...complete.profile, contact_email: null, contact_phone: "41234567" } }).organization).toBe(true);
  });

  it("team needs at least one member besides the owner, lokaler at least one venue", () => {
    expect(byId({ ...complete, memberCount: 1 }).team).toBe(false);
    expect(byId({ ...complete, memberCount: 2 }).team).toBe(true);
    expect(byId({ ...complete, propertyCount: 0 }).lokaler).toBe(false);
  });

  it("billing is done for an active subscription, a trial, or a billing-exempt organization only", () => {
    expect(byId({ ...complete, subscriptionStatus: "trialing" }).billing).toBe(true);
    expect(byId({ ...empty, billingExempt: true }).billing).toBe(true);
    for (const status of ["incomplete", "past_due", "canceled", "unpaid"]) {
      expect(byId({ ...complete, subscriptionStatus: status }).billing).toBe(false);
    }
  });

  it("keeps the order of the checklist and links every item to its settings page", () => {
    const items = computeSetupProgress(empty).items;
    expect(items.map((i) => i.id)).toEqual(["organization", "lokaler", "team", "contract", "billing", "calendar", "portal", "logo"]);
    expect(items.every((i) => i.href.startsWith("/app/settings/"))).toBe(true);
  });
});
