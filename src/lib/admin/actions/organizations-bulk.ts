"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import { updateSubscriptionPeriod } from "@/lib/admin/actions/billing";
import {
  suspendOrganization,
  unsuspendOrganization,
} from "@/lib/admin/actions/organizations";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { adminRoutes } from "@/config/admin-routes";

function revalidateOrgPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/subscriptions");
}

export async function bulkSuspendOrganizations(input: {
  organizationIds: string[];
  reason: string;
}) {
  const adminUser = await requirePlatformAdmin();
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const id of input.organizationIds) {
    const result = await suspendOrganization({
      organizationId: id,
      reason: input.reason,
    });
    results.push({ id, ok: result.ok, error: result.ok ? undefined : result.error });
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.bulk_suspended",
    targetType: "platform",
    targetId: null,
    metadata: { organizationIds: input.organizationIds, count: results.filter((r) => r.ok).length },
  });

  revalidateOrgPaths();
  return { ok: true as const, results };
}

export async function bulkUnsuspendOrganizations(organizationIds: string[]) {
  const adminUser = await requirePlatformAdmin();
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const id of organizationIds) {
    const result = await unsuspendOrganization(id);
    results.push({ id, ok: result.ok, error: result.ok ? undefined : result.error });
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.bulk_unsuspended",
    targetType: "platform",
    targetId: null,
    metadata: { organizationIds, count: results.filter((r) => r.ok).length },
  });

  revalidateOrgPaths();
  return { ok: true as const, results };
}

export async function bulkExtendTrial(input: {
  organizationIds: string[];
  extraDays: number;
}) {
  const adminUser = await requirePlatformAdmin();
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const id of input.organizationIds) {
    const admin = createSupabaseAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("current_period_end")
      .eq("organization_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const base = sub?.current_period_end
      ? new Date(sub.current_period_end)
      : new Date();
    base.setDate(base.getDate() + input.extraDays);

    const result = await updateSubscriptionPeriod({
      organizationId: id,
      periodEnd: base.toISOString(),
    });
    results.push({ id, ok: result.ok, error: result.ok ? undefined : result.error });
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.bulk_trial_extended",
    targetType: "platform",
    targetId: null,
    metadata: {
      organizationIds: input.organizationIds,
      extraDays: input.extraDays,
      count: results.filter((r) => r.ok).length,
    },
  });

  revalidateOrgPaths();
  return { ok: true as const, results };
}

export async function exportOrganizationsCsv(
  organizationIds: string[],
): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("organizations")
    .select(
      "id, name, slug, subscription_status, subscription_plan, is_suspended, billing_email, contact_email, org_number, created_at",
    )
    .order("name", { ascending: true });

  if (organizationIds.length > 0) {
    query = query.in("id", organizationIds);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const header =
    "id,name,slug,status,plan,suspended,billing_email,contact_email,org_number,created_at";
  const rows = (data ?? []).map((o) =>
    [
      o.id,
      csvEscape(o.name),
      o.slug,
      o.subscription_status,
      o.subscription_plan,
      o.is_suspended,
      csvEscape(o.billing_email ?? ""),
      csvEscape(o.contact_email ?? ""),
      csvEscape(o.org_number ?? ""),
      o.created_at,
    ].join(","),
  );

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "export.organizations_csv",
    targetType: "platform",
    targetId: null,
    metadata: { count: rows.length },
  });

  return { ok: true, csv: [header, ...rows].join("\n") };
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
