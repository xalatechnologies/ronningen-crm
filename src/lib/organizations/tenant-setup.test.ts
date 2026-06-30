import { describe, expect, it } from "vitest";

import {
  isOrganizationProfileComplete,
  isAllowedDuringTenantSetup,
  resolveTenantSetupStep,
  shouldResolveAuthDestination,
  tenantSetupPathForStep,
} from "@/lib/organizations/tenant-setup";

describe("tenant setup", () => {
  it("requires org number, address and contact for a complete profile", () => {
    expect(
      isOrganizationProfileComplete({
        org_number: "123456789",
        address_line1: "Gate 1",
        city: "Oslo",
        contact_email: "hei@firma.no",
        contact_phone: null,
      }),
    ).toBe(true);

    expect(
      isOrganizationProfileComplete({
        org_number: "",
        address_line1: "Gate 1",
        city: "Oslo",
        contact_email: "hei@firma.no",
        contact_phone: null,
      }),
    ).toBe(false);
  });

  it("walks organization then lokaler before setup is done", () => {
    expect(
      resolveTenantSetupStep({ profileComplete: false, propertyCount: 0 }),
    ).toBe("organization");
    expect(
      resolveTenantSetupStep({ profileComplete: true, propertyCount: 0 }),
    ).toBe("lokaler");
    expect(
      resolveTenantSetupStep({ profileComplete: true, propertyCount: 2 }),
    ).toBeNull();
  });

  it("maps setup steps to settings paths", () => {
    expect(tenantSetupPathForStep("organization")).toBe(
      "/app/settings/organization",
    );
    expect(tenantSetupPathForStep("lokaler")).toBe("/app/settings/lokaler");
    expect(tenantSetupPathForStep(null)).toBeNull();
  });

  it("allows settings setup routes during onboarding", () => {
    expect(isAllowedDuringTenantSetup("/app/settings/organization")).toBe(true);
    expect(isAllowedDuringTenantSetup("/app/settings/lokaler")).toBe(true);
    expect(isAllowedDuringTenantSetup("/app/settings/account")).toBe(true);
    expect(isAllowedDuringTenantSetup("/app/dashboard")).toBe(false);
  });

  it("resolves default post-login redirects only", () => {
    expect(shouldResolveAuthDestination("/app")).toBe(true);
    expect(shouldResolveAuthDestination("/app/dashboard")).toBe(true);
    expect(shouldResolveAuthDestination("/app/bookings")).toBe(false);
  });
});
