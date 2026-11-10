import {
  ActivityLogSection,
  type ActivityLogRow,
} from "@/components/audit/activity-log-section";
import { getServerTranslation } from "@/i18n/server";
import { isAuditTableName } from "@/lib/audit/describe-audit-entry";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ActivitySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; table?: string }>;
}) {
  const { page: pageParam, table: tableParam } = await searchParams;
  const { t } = await getServerTranslation();
  const [supabase, { organizationId, role }] = await Promise.all([
    getCachedServerSupabaseClient(),
    getCachedServerOrganizationContext(),
  ]);

  if (!organizationId || !role) {
    redirect("/app/onboarding");
  }

  if (!canManageMembers(role)) {
    redirect("/app/settings");
  }

  const tableFilter = isAuditTableName(tableParam) ? tableParam : null;
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const from = (requestedPage - 1) * PAGE_SIZE;

  let query = supabase
    .from("audit_log")
    .select(
      "id, row_id, table_name, op, actor_user_id, actor_role, changed_fields, old_data, new_data, created_at",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (tableFilter) query = query.eq("table_name", tableFilter);

  const { data: logRows, count, error } = await query;

  // PostgREST rejects an offset past the last row; fall back to the first page.
  if (error?.code === "PGRST103") {
    redirect(
      tableFilter
        ? `/app/settings/activity?table=${tableFilter}`
        : "/app/settings/activity",
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
        {t("appPages.settings.activity.loadError", { error: error.message })}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const actorIds = [
    ...new Set(
      (logRows ?? [])
        .map((r) => r.actor_user_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const { data: profileRows } =
    actorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", actorIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const profileById = new Map(
    (profileRows ?? []).map((p) => [p.id, p] as const),
  );

  const rows: ActivityLogRow[] = (logRows ?? []).map((r) => {
    const profile = r.actor_user_id ? profileById.get(r.actor_user_id) : null;
    return {
      id: r.id,
      createdAtIso: r.created_at,
      actorName: r.actor_user_id
        ? profile?.full_name?.trim() ||
          profile?.email ||
          t("appPages.settings.activity.unknownUser")
        : null,
      rowId: r.row_id,
      entry: {
        table_name: r.table_name,
        op: r.op,
        changed_fields: r.changed_fields,
        old_data: r.old_data,
        new_data: r.new_data,
      },
    } satisfies ActivityLogRow;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="app-title">{t("appPages.settings.activity.title")}</h1>
        <p className="mt-2 text-app-base text-muted-foreground">
          {t("appPages.settings.activity.description")}
        </p>
      </div>
      <ActivityLogSection
        rows={rows}
        page={page}
        totalPages={totalPages}
        tableFilter={tableFilter}
      />
    </div>
  );
}
