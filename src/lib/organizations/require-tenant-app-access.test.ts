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

vi.mock("@/lib/organizations/tenant-setup-queries", () => ({
  fetchTenantSetupStatus: vi.fn(),
}));

import { requireTenantAppAccess } from "@/lib/organizations/require-tenant-app-access";

describe("requireTenantAppAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
