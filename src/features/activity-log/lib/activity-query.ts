import { isAuditTableName, type AuditTableName } from "@/lib/audit/describe-audit-entry";

export const ACTIVITY_PAGE_SIZE = 50;

export const ACTIVITY_KINDS = ["created", "changed", "deleted"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** The `op` value the database trigger writes for each kind. */
export const KIND_TO_OP: Record<ActivityKind, "INSERT" | "UPDATE" | "DELETE"> = {
  created: "INSERT",
  changed: "UPDATE",
  deleted: "DELETE",
};

export function isActivityKind(value: unknown): value is ActivityKind {
  return ACTIVITY_KINDS.some((k) => k === value);
}

export type ActivityFilters = { table: AuditTableName | null; kind: ActivityKind | null };
export type ActivityQuery = ActivityFilters & { page: number };

/** Reads the address bar. Anything unknown is ignored, so a hand-edited URL never breaks the page. */
export function parseActivityQuery(params: { page?: string; table?: string; kind?: string }): ActivityQuery {
  const parsed = Number.parseInt(params.page ?? "1", 10);
  return {
    page: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
    table: isAuditTableName(params.table) ? params.table : null,
    kind: isActivityKind(params.kind) ? params.kind : null,
  };
}

/** Address for a filter and page. Defaults (no filter, page 1) are left out. */
export function activityHref({ page, table, kind }: ActivityQuery): string {
  const params = new URLSearchParams();
  if (table) params.set("table", table);
  if (kind) params.set("kind", kind);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/app/settings/activity?${qs}` : "/app/settings/activity";
}

/** First and last entry number on a page (1-based), both 0 when there are no entries. */
export function entryRange(page: number, pageSize: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(total, page * pageSize) };
}
