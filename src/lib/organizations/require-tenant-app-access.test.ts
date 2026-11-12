import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/admin/impersonation", () => ({
  getImpersonationContext: vi.fn(async () => null),
}));

vi.mock("@/lib/organizations/organization-queries", () => ({
  fetchUserOrganizations: vi.fn(),
  fetchActiveOrganizationId: vi.fn(),
}));

const hasPortalAccountMock = vi.fn();

vi.mock("@/lib/portal/context", () => ({
  hasPortalAccount: (...args: unknown[]) => hasPortalAccountMock(...args),
}));

vi.mock("@/lib/organizations/tenant-setup-queries", () => ({
  fetchTenantSetupStatus: vi.fn(),
}));

import { fetchActiveOrganizationId, fetchUserOrganizations } from "@/lib/organizations/organization-queries";
import { requireTenantAppAccess } from "@/lib/organizations/require-tenant-app-access";

describe("requireTenantAppAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUserOrganizations).mockResolvedValue([]);
    vi.mocked(fetchActiveOrganizationId).mockResolvedValue(null);
    hasPortalAccountMock.mockResolvedValue(false);
  });

  it("redirects to login when unauthenticated on protected path", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    await expect(
      requireTenantAppAccess("/app/dashboard"),
    ).rejects.toThrow("REDIRECT:/auth/login");
  });

  it("allows authenticated user on onboarding without org", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1" } },
    });
    const ctx = await requireTenantAppAccess("/app/onboarding");
    expect(ctx.userId).toBe("u1");
    expect(ctx.organizationId).toBeNull();
  });

  it("allows authenticated user on suspended page", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1" } },
    });
    const ctx = await requireTenantAppAccess("/app/suspended");
    expect(ctx.accessLevel).toBe("full");
  });

  it("sends a portal-only customer from tenant onboarding to /portal", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    hasPortalAccountMock.mockResolvedValue(true);
    await expect(requireTenantAppAccess("/app/onboarding")).rejects.toThrow("REDIRECT:/portal");
  });

  it("sends a portal-only customer from /app pages to /portal", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    hasPortalAccountMock.mockResolvedValue(true);
    await expect(requireTenantAppAccess("/app/dashboard")).rejects.toThrow("REDIRECT:/portal");
  });

  it("still sends a user with no membership and no portal account to onboarding", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    await expect(requireTenantAppAccess("/app/dashboard")).rejects.toThrow("REDIRECT:/app/onboarding");
  });
});
