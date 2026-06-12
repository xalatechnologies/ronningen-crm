import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { Json } from "@/types/database.types";

export type JobRunStatus = "success" | "warning" | "failed";

export async function startJobRun(jobName: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("platform_job_runs")
    .insert({
      job_name: jobName,
      status: "success",
    })
    .select("id")
    .single();

  if (error) {
    console.error(`[job-runs] Failed to start ${jobName}:`, error.message);
    return null;
  }

  return data.id;
}

export async function finishJobRun(
  runId: string | null,
  input: {
    status: JobRunStatus;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!runId) return;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("platform_job_runs")
    .update({
      status: input.status,
      finished_at: new Date().toISOString(),
      metadata: (input.metadata ?? {}) as Json,
    })
    .eq("id", runId);

  if (error) {
    console.error(`[job-runs] Failed to finish ${runId}:`, error.message);
  }
}
