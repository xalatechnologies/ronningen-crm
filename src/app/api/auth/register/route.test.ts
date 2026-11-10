import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/server", () => ({
  getServerTranslation: vi.fn(async () => ({
    t: (key: string) => key,
  })),
}));

vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/organizations/tenant-setup-queries", () => ({
  resolvePostAuthRedirect: vi.fn(),
}));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: "not-json",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for validation failure", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "bad", password: "x" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });
});
