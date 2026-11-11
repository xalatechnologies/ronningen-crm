import { beforeEach, describe, expect, it, vi } from "vitest";

const or = vi.fn().mockResolvedValue({ error: null });
const eq = vi.fn(() => ({ or }));
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ update }));

vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: () => ({ from }),
  isSupabaseAdminConfigured: () => true,
}));

import {
  ORGANIZATION_ACTIVITY_THROTTLE_MS,
  touchOrganizationActivity,
} from "./touch-organization-activity";

describe("touchOrganizationActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates last_activity_at only when empty or older than the throttle window", async () => {
    const now = new Date("2026-11-11T12:00:00.000Z");
    await touchOrganizationActivity("org-1", now);

    expect(from).toHaveBeenCalledWith("organizations");
    expect(update).toHaveBeenCalledWith({ last_activity_at: now.toISOString() });
    expect(eq).toHaveBeenCalledWith("id", "org-1");
    const cutoff = new Date(
      now.getTime() - ORGANIZATION_ACTIVITY_THROTTLE_MS,
    ).toISOString();
    expect(or).toHaveBeenCalledWith(
      `last_activity_at.is.null,last_activity_at.lt.${cutoff}`,
    );
  });

  it("never throws when the update fails", async () => {
    or.mockRejectedValueOnce(new Error("db down"));
    await expect(touchOrganizationActivity("org-1")).resolves.toBeUndefined();
  });
});
