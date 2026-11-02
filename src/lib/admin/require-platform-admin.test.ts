import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const getUserMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    rpc: rpcMock,
  })),
}));

import {
  getPlatformAdminContext,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

describe("require-platform-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPlatformAdminContext", () => {
    it("returns null when not authenticated", async () => {
      getUserMock.mockResolvedValue({ data: { user: null } });
      expect(await getPlatformAdminContext()).toBeNull();
    });

    it("returns null when RPC denies admin", async () => {
      getUserMock.mockResolvedValue({
        data: { user: { id: "u1", email: "a@test.com" } },
      });
      rpcMock.mockResolvedValue({ data: false, error: null });
      expect(await getPlatformAdminContext()).toBeNull();
    });

    it("returns context when platform admin", async () => {
      getUserMock.mockResolvedValue({
        data: { user: { id: "u1", email: "admin@test.com" } },
      });
      rpcMock.mockResolvedValue({ data: true, error: null });
      const ctx = await getPlatformAdminContext();
      expect(ctx).toEqual({ userId: "u1", email: "admin@test.com" });
    });
  });

  describe("requirePlatformAdmin", () => {
    it("redirects to login when unauthenticated", async () => {
      getUserMock.mockResolvedValue({ data: { user: null } });
      await expect(requirePlatformAdmin()).rejects.toThrow(
        "REDIRECT:/auth/login?redirect=/admin",
      );
    });

    it("redirects to app when not platform admin", async () => {
      getUserMock.mockResolvedValue({
        data: { user: { id: "u1", email: "user@test.com" } },
      });
      rpcMock.mockResolvedValue({ data: false, error: null });
      await expect(requirePlatformAdmin()).rejects.toThrow("REDIRECT:/app");
    });

    it("returns context for platform admin", async () => {
      getUserMock.mockResolvedValue({
        data: { user: { id: "u1", email: "admin@test.com" } },
      });
      rpcMock.mockResolvedValue({ data: true, error: null });
      const ctx = await requirePlatformAdmin();
      expect(ctx.userId).toBe("u1");
    });
  });
});
