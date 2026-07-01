import { getServerTranslation } from "@/i18n/server";
import { getDateFnsLocale } from "@/i18n/formatters";
import { adminRoutes } from "@/config/admin-routes";
import {
  buildCronHealthComponent,
  buildStripeHealthComponent,
  computeOverallStatus,
  type HealthStatus,
} from "@/lib/admin/platform-integration-status";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { buildFailedPaymentQueue } from "@/lib/admin/trend-data";
import type { AdminQueueItem } from "@/lib/admin/types";
import { isBillingEnabled } from "@/lib/billing/constants";
import { format } from "date-fns";
import type { Translator } from "@/i18n/types";

export type { HealthStatus } from "@/lib/admin/platform-integration-status";

export type SystemHealthComponent = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  href?: string;
};

export type SystemHealthWebhookEvent = {
  eventId: string;
  eventType: string;
  processedAt: string | null;
};

export type SystemHealthJobRun = {
  id: string;
  jobName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  metadataSummary: string | null;
};

export type SystemHealthOverview = {
  overallStatus: HealthStatus;
  components: SystemHealthComponent[];
  openSupportCount: number;
  openSupportQueue: AdminQueueItem[];
  failedPaymentQueue: AdminQueueItem[];
  failedJobQueue: AdminQueueItem[];
  recentWebhooks: SystemHealthWebhookEvent[];
  recentJobRuns: SystemHealthJobRun[];
  lastWebhookHoursAgo: number | null;
  summary: { healthy: number; warning: number; critical: number; total: number };
};

export { computeOverallStatus } from "@/lib/admin/platform-integration-status";

function summarizeComponents(components: SystemHealthComponent[]) {
  let healthy = 0;
  let warning = 0;
  let critical = 0;

  for (const component of components) {
    if (component.status === "critical") critical += 1;
    else if (component.status === "warning") warning += 1;
    else healthy += 1;
  }

  return {
    healthy,
    warning,
    critical,
    total: components.length,
  };
}

function metadataSummary(metadata: unknown, t: Translator): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.expiredLocalTrials === "number") {
    parts.push(t("serverErrors.admin.expiredTrials", { count: record.expiredLocalTrials }));
  }
  if (typeof record.stripeResynced === "number" && record.stripeResynced > 0) {
    parts.push(t("admin.system_health_stripe_resync", { count: record.stripeResynced }));
  }
  if (typeof record.pastDueResynced === "number" && record.pastDueResynced > 0) {
    parts.push(t("admin.system_health_past_due_resync", { count: record.pastDueResynced }));
  }
  if (typeof record.error === "string") return record.error;
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    parts.push(t("admin.system_health_warnings_count", { count: record.errors.length }));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

async function probeDatabase(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  t: Translator,
): Promise<SystemHealthComponent> {
  const dbStart = Date.now();
  const { error } = await admin.from("organizations").select("id").limit(1);
  const dbMs = Date.now() - dbStart;

  return {
    id: "database",
    label: "Database",
    status: error ? "critical" : dbMs > 2000 ? "warning" : "healthy",
    detail: error ? error.message : t("admin.system_health_response_time", { ms: dbMs }),
    href: adminRoutes.settings,
  };
}

async function probeAuth(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  t: Translator,
): Promise<SystemHealthComponent> {
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });

  return {
    id: "auth",
    label: t("admin.system_health_auth_label"),
    status: error ? "critical" : "healthy",
    detail: error ? error.message : t("admin.system_health_auth_ok"),
    href: adminRoutes.settings,
  };
}

export {
  buildCronHealthComponent,
  buildStripeHealthComponent,
} from "@/lib/admin/platform-integration-status";

export async function fetchAdminSystemHealthOverview(): Promise<SystemHealthOverview> {
  const { t, locale } = await getServerTranslation();
  const dateLocale = getDateFnsLocale(locale);
  const admin = createSupabaseAdminClient();
  const billingOn = isBillingEnabled();

  const [
    database,
    auth,
    { data: webhooks },
    { data: jobRuns },
    { data: failedJobs },
    { data: openTickets },
    { count: openSupportCount },
    { data: orgs },
    { data: lastBillingJob },
  ] = await Promise.all([
    probeDatabase(admin, t),
    probeAuth(admin, t),
    admin
      .from("stripe_webhook_events")
      .select("event_id, event_type, processed_at")
      .order("processed_at", { ascending: false, nullsFirst: false })
      .limit(10),
    admin
      .from("platform_job_runs")
      .select("id, job_name, status, started_at, finished_at, metadata")
      .order("started_at", { ascending: false })
      .limit(10),
    admin
      .from("platform_job_runs")
      .select("id, job_name, status, started_at, finished_at, metadata")
      .eq("status", "failed")
      .gte("started_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("started_at", { ascending: false })
      .limit(6),
    admin
      .from("platform_support_tickets")
      .select("id, subject, organization_id, updated_at, status")
      .eq("status", "open")
      .order("updated_at", { ascending: true })
      .limit(6),
    admin
      .from("platform_support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("organizations")
      .select(
        "id, name, subscription_status, is_suspended, created_at, billing_email",
      )
      .order("name"),
    admin
      .from("platform_job_runs")
      .select("status, finished_at")
      .eq("job_name", "billing-enforcement")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lastWebhookAt =
    webhooks?.find((w) => w.processed_at)?.processed_at ?? null;
  const lastWebhookHoursAgo = lastWebhookAt
    ? (Date.now() - new Date(lastWebhookAt).getTime()) / (1000 * 60 * 60)
    : null;

  const stripe = buildStripeHealthComponent(lastWebhookAt, t);
  const cron = buildCronHealthComponent(lastBillingJob ?? null, t);
  const components = [database, auth, stripe, cron];
  const overallStatus = computeOverallStatus(components);

  const orgById = new Map((orgs ?? []).map((o) => [o.id, o.name] as const));

  const openSupportTotal = openSupportCount ?? 0;
  const openSupportQueue: AdminQueueItem[] = (openTickets ?? []).map((t) => ({
    id: t.id,
    label: orgById.get(t.organization_id) ?? t.organization_id,
    sublabel: t.subject,
    href: adminRoutes.organizationDetail(t.organization_id),
    meta: format(new Date(t.updated_at), "d. MMM yyyy", { locale: dateLocale }),
  }));

  const failedPaymentQueue = buildFailedPaymentQueue(orgs ?? [], 6);

  const failedJobQueue: AdminQueueItem[] = (failedJobs ?? []).map((job) => ({
    id: job.id,
    label: job.job_name,
    sublabel: metadataSummary(job.metadata, t) ?? undefined,
    href: adminRoutes.systemHealth,
    meta: job.finished_at
      ? format(new Date(job.finished_at), "d. MMM yyyy HH:mm", { locale: dateLocale })
      : format(new Date(job.started_at), "d. MMM yyyy HH:mm", { locale: dateLocale }),
  }));

  return {
    overallStatus,
    components,
    openSupportCount: openSupportTotal,
    openSupportQueue,
    failedPaymentQueue,
    failedJobQueue,
    recentWebhooks: (webhooks ?? []).map((w) => ({
      eventId: w.event_id,
      eventType: w.event_type,
      processedAt: w.processed_at,
    })),
    recentJobRuns: (jobRuns ?? []).map((j) => ({
      id: j.id,
      jobName: j.job_name,
      status: j.status,
      startedAt: j.started_at,
      finishedAt: j.finished_at,
      metadataSummary: metadataSummary(j.metadata, t),
    })),
    lastWebhookHoursAgo: billingOn ? lastWebhookHoursAgo : null,
    summary: summarizeComponents(components),
  };
}

/** @deprecated Use fetchAdminSystemHealthOverview */
export async function fetchAdminSystemHealth() {
  const overview = await fetchAdminSystemHealthOverview();
  return overview.components;
}

export type SystemHealthMetric = SystemHealthComponent;
