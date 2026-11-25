import { describe, expect, it } from "vitest";

import { USER_ROLES } from "@/constants/roles";
import { TOUR_STEPS, getTourSteps } from "@/features/welcome-tour/lib/tour-steps";

const keys = (role: Parameters<typeof getTourSteps>[0]) => getTourSteps(role).map((s) => s.key);

describe("getTourSteps", () => {
  it("gives owners and admins every step, in order", () => {
    const all = TOUR_STEPS.map((s) => s.key);
    expect(keys("owner")).toEqual(all);
    expect(keys("admin")).toEqual(all);
  });

  it("leaves out steps for settings the role cannot open", () => {
    for (const role of ["manager", "accountant", "viewer"] as const) {
      const shown = keys(role);
      expect(shown).not.toContain("company");
      expect(shown).not.toContain("contracts");
      expect(shown).not.toContain("team");
    }
  });

  it("still gives every role the steps that need no special access, starting with welcome and ending with help", () => {
    for (const role of USER_ROLES) {
      const shown = keys(role);
      expect(shown[0]).toBe("welcome");
      expect(shown.at(-1)).toBe("help");
      expect(shown).toEqual(expect.arrayContaining(["venue", "bookings", "pricing", "customers", "invoices", "account"]));
    }
  });

  it("shows nothing that needs access to someone without a role", () => {
    const shown = keys(null);
    expect(shown).not.toContain("team");
    expect(shown).not.toContain("company");
  });

  it("has data-only steps: unique keys, routes inside the app, selectors that use data-tour", () => {
    expect(new Set(TOUR_STEPS.map((s) => s.key)).size).toBe(TOUR_STEPS.length);
    for (const step of TOUR_STEPS) {
      if (step.route) expect(step.route.startsWith("/app/")).toBe(true);
      for (const selector of step.targets) expect(selector).toMatch(/^\[data-tour="[a-z-]+"\]$/);
    }
  });
});
