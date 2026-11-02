import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/job-runs", () => ({
  startJobRun: vi.fn().mockResolvedValue("run-1"),
  finishJobRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const sendTrialRemindersMock = vi.fn();
vi.mock("@/lib/notifications/send-platform-notification", () => ({
  sendTrialReminders: () => sendTrialRemindersMock(),
}));

import { GET } from "@/app/api/cron/trial-reminders/route";
import { mockCronRequest } from "../../../../../tests/helpers";

describe("GET /api/cron/trial-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    sendTrialRemindersMock.mockResolvedValue({ sent: 0, failed: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 without cron secret", async () => {
    const res = await GET(new Request("http://localhost/api/cron/trial-reminders"));
    expect(res.status).toBe(401);
  });

  it("runs with valid secret", async () => {
    const res = await GET(mockCronRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    expect(sendTrialRemindersMock).toHaveBeenCalled();
  });
});
