import { AdminAuditWorkspace } from "@/components/admin/admin-audit-workspace";
import type { AdminAuditCategory } from "@/lib/admin/audit-categories";
import { fetchAdminAuditPageData } from "@/lib/admin/queries/users-billing-audit";
type PageProps = {
  searchParams: Promise<{
    category?: string;
    action?: string;
    page?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
};

const PAGE_SIZE = 25;

const VALID_CATEGORIES = new Set<AdminAuditCategory>([
  "all",
  "organization",
  "subscription",
  "users",
  "support",
  "platform",
]);

function parseCategory(value: string | undefined): AdminAuditCategory {
  if (value && VALID_CATEGORIES.has(value as AdminAuditCategory)) {
    return value as AdminAuditCategory;
  }
  return "all";
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const category = parseCategory(params.category);
  const selectedAction = params.action ?? "";
  const search = params.q ?? "";
  const from = params.from;
  const to = params.to;

  const data = await fetchAdminAuditPageData({
    category: category === "all" ? undefined : category,
    action: selectedAction || undefined,
    q: search || undefined,
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <AdminAuditWorkspace
      entries={data.entries}
      total={data.total}
      stats={data.stats}
      page={page}
      pageSize={PAGE_SIZE}
      selectedCategory={category}
      selectedAction={selectedAction}
      initialSearch={search}
      fromDate={from ?? ""}
      toDate={to ?? ""}
    />
  );
}
