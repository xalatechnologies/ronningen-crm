import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/job-runs", () => ({
  startJobRun: vi.fn().mockResolvedValue("run-1"),
  finishJobRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const enforceBillingAccessMock = vi.fn();
vi.mock("@/lib/billing/enforce-billing-access", () => ({
  enforceBillingAccess: () => enforceBillingAccessMock(),
}));

import { GET } from "@/app/api/cron/billing-enforcement/route";
import { mockCronRequest } from "../../../../../tests/helpers";

describe("GET /api/cron/billing-enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    enforceBillingAccessMock.mockResolvedValue({
      expiredLocalTrials: 0,
      stripeResynced: 0,
      pastDueResynced: 0,
      errors: [],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 without cron secret", async () => {
    const res = await GET(new Request("http://localhost/api/cron/billing-enforcement"));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const res = await GET(mockCronRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("runs enforcement with valid bearer secret", async () => {
    const res = await GET(mockCronRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(enforceBillingAccessMock).toHaveBeenCalled();
  });

  it("accepts x-cron-secret header", async () => {
    const res = await GET(
      mockCronRequest("test-cron-secret", { header: "x-cron-secret" }),
    );
    expect(res.status).toBe(200);
  });
});
