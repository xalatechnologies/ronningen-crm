"use server";

import { logAdminAction } from "@/lib/admin/audit-log";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  fetchAdminAuditLogPaginated,
  type AdminAuditFilters,
} from "@/lib/admin/queries/users-billing-audit";
import { formatAuditActionLabel } from "@/lib/admin/audit-labels";

export async function exportAuditLogCsv(
  filters: AdminAuditFilters = {},
): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  const adminUser = await requirePlatformAdmin();

  const { entries } = await fetchAdminAuditLogPaginated({
    ...filters,
    limit: 5000,
    offset: 0,
  });

  const header =
    "id,created_at,action,action_label,target_type,target_id,actor_email,actor_name";
  const rows = entries.map((e) =>
    [
      e.id,
      e.createdAt,
      e.action,
      csvEscape(formatAuditActionLabel(e.action)),
      e.targetType,
      e.targetId ?? "",
      csvEscape(e.actorEmail ?? ""),
      csvEscape(e.actorName ?? ""),
    ].join(","),
  );

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "export.audit_csv",
    targetType: "platform",
    targetId: null,
    metadata: { count: rows.length, filters },
  });

  return { ok: true, csv: [header, ...rows].join("\n") };
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
