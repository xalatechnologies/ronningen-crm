import { AppPageHeader } from "@/components/layout/app-page-header";
import { ActivityLogSection, type ActivityLogRow } from "@/features/activity-log/components/activity-log-section";
import {
  ACTIVITY_PAGE_SIZE,
  KIND_TO_OP,
  activityHref,
  parseActivityQuery,
} from "@/features/activity-log/lib/activity-query";
import { loadActivityContext } from "@/features/activity-log/data/activity-context";
import { entryBookingId, entryMemberUserId, entrySubject } from "@/features/activity-log/lib/entry-references";
import { getServerTranslation } from "@/i18n/server";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ActivitySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; table?: string; kind?: string }>;
}) {
  const { page: requestedPage, table: tableFilter, kind: kindFilter } = parseActivityQuery(await searchParams);
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

  const from = (requestedPage - 1) * ACTIVITY_PAGE_SIZE;

  let query = supabase
    .from("audit_log")
    .select(
      "id, row_id, table_name, op, actor_user_id, actor_role, changed_fields, old_data, new_data, created_at",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + ACTIVITY_PAGE_SIZE - 1);
  if (tableFilter) query = query.eq("table_name", tableFilter);
  if (kindFilter) query = query.eq("op", KIND_TO_OP[kindFilter]);

  const { data: logRows, count, error } = await query;

  // PostgREST rejects an offset past the last row; fall back to the first page.
  if (error?.code === "PGRST103") {
    redirect(activityHref({ page: 1, table: tableFilter, kind: kindFilter }));
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
        {t("appPages.settings.activity.loadError", { error: error.message })}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / ACTIVITY_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const entries = (logRows ?? []).map((r) => ({
    row: r,
    entry: {
      table_name: r.table_name,
      op: r.op,
      changed_fields: r.changed_fields,
      old_data: r.old_data,
      new_data: r.new_data,
    },
  }));

  const userIds = [
    ...new Set(
      entries.flatMap(({ row, entry }) => [row.actor_user_id, entryMemberUserId(entry)]).filter((id): id is string => id !== null),
    ),
  ];
  const bookingIds = [...new Set(entries.map(({ entry }) => entryBookingId(entry)).filter((id): id is string => id !== null))];
  const context = await loadActivityContext(supabase, organizationId, userIds, bookingIds);

  const rows: ActivityLogRow[] = entries.map(({ row, entry }) => {
    const actor = row.actor_user_id ? context.people.get(row.actor_user_id) : null;
    const memberUserId = entryMemberUserId(entry);
    const memberPerson = memberUserId ? context.people.get(memberUserId) : null;
    const bookingId = entryBookingId(entry);
    return {
      id: row.id,
      createdAtIso: row.created_at,
      actor: row.actor_user_id
        ? {
            name: actor?.name || actor?.email || t("appPages.settings.activity.unknownUser"),
            email: actor?.name ? actor.email : null,
            role: actor?.role ?? null,
          }
        : null,
      rowId: row.row_id,
      entry,
      subject: memberPerson ? memberPerson.name || memberPerson.email : entrySubject(entry),
      booking: bookingId ? { id: bookingId, reference: context.bookingReferences.get(bookingId) ?? null } : null,
    } satisfies ActivityLogRow;
  });

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("appPages.settings.activity.title")}
        description={t("appPages.settings.activity.description")}
      />
      <ActivityLogSection
        rows={rows}
        page={page}
        totalPages={totalPages}
        total={count ?? 0}
        table={tableFilter}
        kind={kindFilter}
        now={new Date()}
      />
    </div>
  );
}
