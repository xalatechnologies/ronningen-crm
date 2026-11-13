import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: null as { id: string } | null, destination: "/portal" }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/organizations/tenant-setup-queries", () => ({
  resolvePostAuthRedirect: async () => state.destination,
}));

import { GET } from "@/app/open/route";

const open = () => GET(new Request("https://eventmanager.no/open?source=pwa"));

describe("GET /open (installed app launch)", () => {
  beforeEach(() => {
    state.user = null;
    state.destination = "/portal";
  });

  it("sends a signed-out visitor to the login page", async () => {
    const res = await open();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://eventmanager.no/auth/login");
  });

  it("sends a customer to the portal and staff to the venue app", async () => {
    state.user = { id: "u1" };
    expect((await open()).headers.get("location")).toBe("https://eventmanager.no/portal");
    state.destination = "/app/dashboard";
    expect((await open()).headers.get("location")).toBe("https://eventmanager.no/app/dashboard");
  });
});
