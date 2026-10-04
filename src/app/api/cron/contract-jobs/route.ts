import { NextResponse } from "next/server";

import { finishJobRun, startJobRun } from "@/lib/admin/job-runs";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { processContractJobs } from "@/lib/contracts/jobs";

export const runtime = "nodejs";

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

  const runId = await startJobRun("contract-jobs");
  try {
    const admin = createSupabaseAdminClient();
    const expired = await admin.rpc("contract_expire_outstanding" as never);
    const jobs = await processContractJobs(20);
    const result = { expired: expired.data ?? 0, ...jobs };
    await finishJobRun(runId, {
      status: jobs.failed > 0 ? "warning" : "success",
      metadata: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await finishJobRun(runId, {
      status: "failed",
      metadata: { error: error instanceof Error ? error.message : "error" },
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
