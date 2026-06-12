import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { finishJobRun, startJobRun } from "@/lib/admin/job-runs";
import { sendTrialReminders } from "@/lib/notifications/send-platform-notification";

export const runtime = "nodejs";

const JOB_NAME = "trial-reminders";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runId = await startJobRun(JOB_NAME);

  try {
    const result = await sendTrialReminders();

    await finishJobRun(runId, {
      status: result.failed > 0 ? "warning" : "success",
      metadata: result,
    });

    revalidatePath("/admin/notifications");
    revalidatePath("/admin/system-health");

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Trial reminders failed.";

    await finishJobRun(runId, {
      status: "failed",
      metadata: { error: message },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
