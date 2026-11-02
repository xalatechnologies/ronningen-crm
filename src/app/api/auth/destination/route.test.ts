import { describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/organizations/tenant-setup-queries", () => ({
  resolvePostAuthRedirect: vi.fn(async () => "/app/dashboard"),
}));

import { GET } from "@/app/api/auth/destination/route";

describe("GET /api/auth/destination", () => {
  it("returns 401 when not authenticated", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns redirect path for authenticated user", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1" } },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.redirectTo).toBe("/app/dashboard");
  });
});
