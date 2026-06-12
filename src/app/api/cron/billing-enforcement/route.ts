import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { finishJobRun, startJobRun } from "@/lib/admin/job-runs";
import { enforceBillingAccess } from "@/lib/billing/enforce-billing-access";

export const runtime = "nodejs";

const JOB_NAME = "billing-enforcement";

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
    const result = await enforceBillingAccess();

    const hasErrors = result.errors.length > 0;
    await finishJobRun(runId, {
      status: hasErrors ? "warning" : "success",
      metadata: {
        expiredLocalTrials: result.expiredLocalTrials,
        stripeResynced: result.stripeResynced,
        pastDueResynced: result.pastDueResynced,
        errors: result.errors,
      },
    });

    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin/system-health");
    revalidatePath("/app/settings/billing");

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Billing enforcement failed.";

    await finishJobRun(runId, {
      status: "failed",
      metadata: { error: message },
    });

    console.error("[cron/billing-enforcement]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
