import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  })),
}));

vi.mock("@/i18n/server", () => ({
  getServerTranslation: vi.fn(async () => ({
    t: (key: string) => key,
  })),
}));

import { requireOrganizationOwner } from "@/lib/billing/require-organization-owner";

function mockMemberQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eqUser = vi.fn().mockReturnValue({ maybeSingle });
  const eqOrg = vi.fn().mockReturnValue({ eq: eqUser });
  const select = vi.fn().mockReturnValue({ eq: eqOrg });
  fromMock.mockReturnValue({ select });
}

describe("requireOrganizationOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated users", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await requireOrganizationOwner("org-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("serverErrors.auth.mustBeLoggedIn");
    }
  });

  it("rejects non-owner members", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1", email: "m@test.com" } },
    });
    mockMemberQuery({ data: { role: "manager" }, error: null });
    const result = await requireOrganizationOwner("org-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("serverErrors.billing.ownerOnly");
    }
  });

  it("accepts owner", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1", email: "o@test.com" } },
    });
    mockMemberQuery({ data: { role: "owner" }, error: null });
    const result = await requireOrganizationOwner("org-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.owner.userId).toBe("u1");
    }
  });
});
