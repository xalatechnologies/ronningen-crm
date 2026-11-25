import { describe, expect, it } from "vitest";

import { buildSetupChecklist, type SetupFacts } from "@/features/setup-checklist/lib/setup-checklist";

const empty: SetupFacts = {
  profile: { org_number: null, address_line1: null, city: null, contact_email: null, contact_phone: null, bank_account: null, payment_instructions: null },
  propertyCount: 0,
  priceCount: 0,
  memberCount: 1,
  invitationCount: 0,
  inquiryCount: 0,
  bookingCount: 0,
  hasSubscription: false,
};

const fullProfile = { ...empty.profile, org_number: "974760673", address_line1: "Gata 1", city: "Oslo", contact_email: "a@b.no" };
const done = (c: ReturnType<typeof buildSetupChecklist>, id: string) => c.steps.find((s) => s.id === id)?.done;

describe("buildSetupChecklist", () => {
  it("starts a brand-new organization at one step done (it exists), pointing at the business details", () => {
    const c = buildSetupChecklist(empty, { billingEnabled: true });
    expect(c.doneCount).toBe(1);
    expect(c.total).toBe(8);
    expect(c.percent).toBe(13);
    expect(c.complete).toBe(false);
    expect(c.nextId).toBe("details");
    expect(c.steps.find((s) => s.id === "details")?.href).toBe("/app/settings/organization");
  });

  it("leaves out the subscription step when billing is off, and counts from the rest", () => {
    const c = buildSetupChecklist(empty, { billingEnabled: false });
    expect(c.steps.map((s) => s.id)).not.toContain("subscription");
    expect(c.total).toBe(7);
    expect(c.percent).toBe(14);
  });

  it("ticks each step from the matching fact only", () => {
    const base = buildSetupChecklist(empty, { billingEnabled: true });
    expect(done(base, "venue")).toBe(false);
    expect(done(buildSetupChecklist({ ...empty, propertyCount: 1 }, { billingEnabled: true }), "venue")).toBe(true);
    expect(done(buildSetupChecklist({ ...empty, priceCount: 2 }, { billingEnabled: true }), "pricing")).toBe(true);
    expect(done(buildSetupChecklist({ ...empty, profile: fullProfile }, { billingEnabled: true }), "details")).toBe(true);
    expect(done(buildSetupChecklist({ ...empty, hasSubscription: true }, { billingEnabled: true }), "subscription")).toBe(true);
  });

  it("needs org number, address and a contact for the business details, not just one of them", () => {
    const partial = { ...fullProfile, org_number: null };
    expect(done(buildSetupChecklist({ ...empty, profile: partial }, { billingEnabled: true }), "details")).toBe(false);
  });

  it("counts payment details from a bank account or instructions, ignoring blanks", () => {
    const withBlank = { ...empty, profile: { ...empty.profile, bank_account: "   " } };
    expect(done(buildSetupChecklist(withBlank, { billingEnabled: true }), "payment")).toBe(false);
    const bank = { ...empty, profile: { ...empty.profile, bank_account: "1234.56.78903" } };
    expect(done(buildSetupChecklist(bank, { billingEnabled: true }), "payment")).toBe(true);
    const instructions = { ...empty, profile: { ...empty.profile, payment_instructions: "Vipps til 123" } };
    expect(done(buildSetupChecklist(instructions, { billingEnabled: true }), "payment")).toBe(true);
  });

  it("counts a teammate as joined or invited, and the first booking as an inquiry or a booking", () => {
    expect(done(buildSetupChecklist({ ...empty, memberCount: 2 }, { billingEnabled: true }), "team")).toBe(true);
    expect(done(buildSetupChecklist({ ...empty, invitationCount: 1 }, { billingEnabled: true }), "team")).toBe(true);
    expect(done(buildSetupChecklist({ ...empty, inquiryCount: 1 }, { billingEnabled: true }), "firstBooking")).toBe(true);
    expect(done(buildSetupChecklist({ ...empty, bookingCount: 1 }, { billingEnabled: true }), "firstBooking")).toBe(true);
  });

  it("is complete at 100 percent with nothing left to do", () => {
    const all: SetupFacts = { profile: { ...fullProfile, bank_account: "1234.56.78903" }, propertyCount: 1, priceCount: 1, memberCount: 2, invitationCount: 0, inquiryCount: 1, bookingCount: 0, hasSubscription: true };
    const c = buildSetupChecklist(all, { billingEnabled: true });
    expect(c.percent).toBe(100);
    expect(c.complete).toBe(true);
    expect(c.nextId).toBeNull();
  });

  it("points at the first step that is not done, in order", () => {
    const c = buildSetupChecklist({ ...empty, profile: fullProfile }, { billingEnabled: true });
    expect(c.nextId).toBe("venue");
  });
});
