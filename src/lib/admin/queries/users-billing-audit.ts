import {
  type AdminAuditCategory,
  computeAuditCategoryCounts,
  platformAuditOrFilter,
} from "@/lib/admin/audit-categories";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

export type AdminUserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  isPlatformAdmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  isDisabled: boolean;
  organizationCount: number;
  organizations: { id: string; name: string; role: string }[];
};

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const admin = createSupabaseAdminClient();

  const [{ data: profiles, error }, authUsers] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name, is_platform_admin, created_at")
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (error) throw error;

  const authById = new Map(
    (authUsers.data.users ?? []).map((u) => [u.id, u] as const),
  );

  const { data: memberships } = await admin
    .from("organization_members")
    .select("user_id, organization_id, role");

  const { data: orgs } = await admin.from("organizations").select("id, name");
  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name] as const));

  const membershipsByUser = new Map<
    string,
    { id: string; name: string; role: string }[]
  >();

  for (const m of memberships ?? []) {
    const list = membershipsByUser.get(m.user_id) ?? [];
    list.push({
      id: m.organization_id,
      name: orgNameById.get(m.organization_id) ?? m.organization_id,
      role: m.role,
    });
    membershipsByUser.set(m.user_id, list);
  }

  for (const list of membershipsByUser.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "nb"));
  }

  return (profiles ?? []).map((p) => {
    const organizations = membershipsByUser.get(p.id) ?? [];
    const authUser = authById.get(p.id);
    const banned =
      authUser?.banned_until != null &&
      new Date(authUser.banned_until) > new Date();
    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      isPlatformAdmin: p.is_platform_admin,
      createdAt: p.created_at,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      isDisabled: banned,
      organizationCount: organizations.length,
      organizations,
    };
  });
}

export type AdminBillingRow = {
  id: string;
  name: string;
  slug: string;
  billingEmail: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string;
  isSuspended: boolean;
  periodEnd: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  memberCount: number;
  createdAt: string;
};

export async function fetchAdminBillingOverview(): Promise<AdminBillingRow[]> {
  const admin = createSupabaseAdminClient();

  const { data: orgs, error } = await admin
    .from("organizations")
    .select(
      "id, name, slug, billing_email, subscription_status, subscription_plan, is_suspended, created_at",
    )
    .order("subscription_status", { ascending: true });

  if (error) throw error;

  const [{ data: memberCounts }, { data: subscriptions }] = await Promise.all([
    admin.from("organization_members").select("organization_id"),
    admin
      .from("subscriptions")
      .select(
        "organization_id, current_period_end, provider_customer_id, provider_subscription_id, created_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  const countByOrg = new Map<string, number>();
  for (const row of memberCounts ?? []) {
    countByOrg.set(
      row.organization_id,
      (countByOrg.get(row.organization_id) ?? 0) + 1,
    );
  }

  const subscriptionByOrg = new Map<
    string,
    {
      periodEnd: string | null;
      providerCustomerId: string | null;
      providerSubscriptionId: string | null;
    }
  >();
  for (const sub of subscriptions ?? []) {
    if (!subscriptionByOrg.has(sub.organization_id)) {
      subscriptionByOrg.set(sub.organization_id, {
        periodEnd: sub.current_period_end,
        providerCustomerId: sub.provider_customer_id,
        providerSubscriptionId: sub.provider_subscription_id,
      });
    }
  }

  return (orgs ?? []).map((o) => {
    const sub = subscriptionByOrg.get(o.id);
    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      billingEmail: o.billing_email,
      subscriptionStatus: o.subscription_status,
      subscriptionPlan: o.subscription_plan,
      isSuspended: o.is_suspended,
      periodEnd: sub?.periodEnd ?? null,
      providerCustomerId: sub?.providerCustomerId ?? null,
      providerSubscriptionId: sub?.providerSubscriptionId ?? null,
      memberCount: countByOrg.get(o.id) ?? 0,
      createdAt: o.created_at,
    };
  });
}

export type AdminAuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorUserId: string;
  actorEmail: string | null;
  actorName: string | null;
};

export type AdminUserDetail = {
  id: string;
  email: string | null;
  fullName: string | null;
  isPlatformAdmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  isDisabled: boolean;
  organizations: {
    id: string;
    name: string;
    role: string;
    joinedAt: string;
  }[];
  auditEntries: AdminAuditEntry[];
};

export async function fetchAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const admin = createSupabaseAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, email, full_name, is_platform_admin, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!profile) return null;

  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const authUser = authData.user;
  const banned =
    authUser?.banned_until != null &&
    new Date(authUser.banned_until) > new Date();

  const [{ data: memberships }, auditEntries] = await Promise.all([
    admin
      .from("organization_members")
      .select("organization_id, role, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    fetchAdminAuditLog({ limit: 20, targetId: userId }),
  ]);

  const orgIds = (memberships ?? []).map((m) => m.organization_id);
  const { data: orgs } =
    orgIds.length > 0
      ? await admin.from("organizations").select("id, name").in("id", orgIds)
      : { data: [] };

  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name] as const));

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    isPlatformAdmin: profile.is_platform_admin,
    createdAt: profile.created_at,
    lastSignInAt: authUser?.last_sign_in_at ?? null,
    isDisabled: banned,
    organizations: (memberships ?? []).map((m) => ({
      id: m.organization_id,
      name: orgNameById.get(m.organization_id) ?? m.organization_id,
      role: m.role,
      joinedAt: m.created_at,
    })),
    auditEntries,
  };
}

export type AdminAuditFilters = {
  action?: string;
  category?: AdminAuditCategory;
  q?: string;
  actorUserId?: string;
  limit?: number;
  offset?: number;
  targetId?: string;
  from?: string;
  to?: string;
};

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

async function resolveSearchActorIds(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  q: string,
): Promise<string[]> {
  const pattern = `%${escapeIlikePattern(q.trim())}%`;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .or(`email.ilike.${pattern},full_name.ilike.${pattern}`);

  return (data ?? []).map((row) => row.id);
}

export type AdminAuditResult = {
  entries: AdminAuditEntry[];
  total: number;
};

export async function fetchAdminAuditLog(
  filters: AdminAuditFilters = {},
): Promise<AdminAuditEntry[]> {
  const result = await fetchAdminAuditLogPaginated(filters);
  return result.entries;
}

export async function fetchAdminAuditLogPaginated(
  filters: AdminAuditFilters = {},
): Promise<AdminAuditResult> {
  const admin = createSupabaseAdminClient();
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;

  let query = admin
    .from("platform_audit_log")
    .select(
      "id, action, target_type, target_id, metadata, created_at, actor_user_id",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  const category = filters.category;
  if (category && category !== "all") {
    switch (category) {
      case "organization":
        query = query
          .like("action", "organization.%")
          .not("action", "like", "organization.subscription%");
        break;
      case "subscription":
        query = query.or(
          "action.like.organization.subscription%,action.like.subscription.%",
        );
        break;
      case "users":
        query = query.like("action", "user.%");
        break;
      case "support":
        query = query.like("action", "support.%");
        break;
      case "platform":
        query = query.or(platformAuditOrFilter());
        break;
    }
  }

  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.actorUserId) {
    query = query.eq("actor_user_id", filters.actorUserId);
  }
  if (filters.targetId) {
    query = query.eq("target_id", filters.targetId);
  }
  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }

  const search = filters.q?.trim();
  if (search) {
    const pattern = `%${escapeIlikePattern(search)}%`;
    const actorIds = await resolveSearchActorIds(admin, search);
    const parts = [`action.ilike.${pattern}`, `target_id.ilike.${pattern}`];
    if (actorIds.length > 0) {
      parts.push(`actor_user_id.in.(${actorIds.join(",")})`);
    }
    query = query.or(parts.join(","));
  }

  const { data: entries, error, count } = await query.range(
    offset,
    offset + limit - 1,
  );

  if (error) throw error;

  const actorIds = [...new Set((entries ?? []).map((e) => e.actor_user_id))];
  const { data: profiles } =
    actorIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", actorIds)
      : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p] as const),
  );

  return {
    total: count ?? 0,
    entries: (entries ?? []).map((e) => {
      const actor = profileById.get(e.actor_user_id);
      return {
        id: e.id,
        action: e.action,
        targetType: e.target_type,
        targetId: e.target_id,
        metadata: (e.metadata as Record<string, unknown>) ?? {},
        createdAt: e.created_at,
        actorUserId: e.actor_user_id,
        actorEmail: actor?.email ?? null,
        actorName: actor?.full_name ?? null,
      };
    }),
  };
}

export async function fetchAdminAuditActions(): Promise<string[]> {
  const stats = await fetchAdminAuditOverviewStats();
  return stats.actionCounts.map(({ action }) => action);
}

export type AdminAuditActionCount = {
  action: string;
  count: number;
};

export type AdminAuditOverviewStats = {
  total: number;
  last7Days: number;
  uniqueActors30d: number;
  actionCounts: AdminAuditActionCount[];
  categoryCounts: Record<AdminAuditCategory, number>;
  topAction: AdminAuditActionCount | null;
};

export type AdminAuditPageData = {
  entries: AdminAuditEntry[];
  total: number;
  stats: AdminAuditOverviewStats;
};

export type AdminSubscriptionAnalytics = {
  orgs: {
    subscriptionStatus: string;
    isSuspended: boolean;
    createdAt: string;
  }[];
  canceledLast30d: number;
  convertedTrialsLast30d: number;
  trialingStartLast30d: number;
};

export async function fetchAdminSubscriptionAnalytics(): Promise<AdminSubscriptionAnalytics> {
  const admin = createSupabaseAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  const [{ data: orgs }, { data: auditRows }] = await Promise.all([
    admin
      .from("organizations")
      .select("subscription_status, is_suspended, created_at"),
    admin
      .from("platform_audit_log")
      .select("action, metadata, target_id, created_at")
      .gte("created_at", since)
      .in("action", [
        "organization.subscription_updated",
        "organization.deleted",
      ]),
  ]);

  const convertedOrgIds = new Set<string>();
  const canceledOrgIds = new Set<string>();

  for (const entry of auditRows ?? []) {
    const meta = entry.metadata as Record<string, unknown> | null;
    const before = meta?.before as { subscription_status?: string } | undefined;
    const after = meta?.after as { subscription_status?: string } | undefined;
    const targetId = entry.target_id;

    if (entry.action === "organization.subscription_updated" && targetId) {
      if (
        before?.subscription_status === "trialing" &&
        after?.subscription_status === "active"
      ) {
        convertedOrgIds.add(targetId);
      }
      if (after?.subscription_status === "canceled") {
        canceledOrgIds.add(targetId);
      }
    }
    if (entry.action === "organization.deleted" && targetId) {
      canceledOrgIds.add(targetId);
    }
  }

  const canceledLast30d = canceledOrgIds.size;
  const convertedTrialsLast30d = convertedOrgIds.size;

  const trialingStartLast30d = (orgs ?? []).filter(
    (o) =>
      !o.is_suspended && new Date(o.created_at) >= thirtyDaysAgo,
  ).length;

  return {
    orgs: (orgs ?? []).map((o) => ({
      subscriptionStatus: o.subscription_status,
      isSuspended: o.is_suspended,
      createdAt: o.created_at,
    })),
    canceledLast30d,
    convertedTrialsLast30d,
    trialingStartLast30d,
  };
}

async function fetchAuditActionCounts(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<AdminAuditActionCount[]> {
  const { data, error } = await admin.rpc("audit_action_counts");

  if (!error && data) {
    return data.map((row) => ({
      action: row.action,
      count: Number(row.count),
    }));
  }

  const { data: rows, error: fallbackError } = await admin
    .from("platform_audit_log")
    .select("action");

  if (fallbackError) throw fallbackError;

  const countByAction = new Map<string, number>();
  for (const row of rows ?? []) {
    countByAction.set(row.action, (countByAction.get(row.action) ?? 0) + 1);
  }

  return [...countByAction.entries()]
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count || a.action.localeCompare(b.action));
}

export async function fetchAdminAuditOverviewStats(): Promise<AdminAuditOverviewStats> {
  const admin = createSupabaseAdminClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalResult, recentResult, actionCounts, uniqueActorsResult] =
    await Promise.all([
      admin
        .from("platform_audit_log")
        .select("id", { count: "exact", head: true }),
      admin
        .from("platform_audit_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString()),
      fetchAuditActionCounts(admin),
      admin.rpc("audit_unique_actors_since", {
        since_at: thirtyDaysAgo.toISOString(),
      }),
    ]);

  if (totalResult.error) throw totalResult.error;
  if (recentResult.error) throw recentResult.error;

  let uniqueActors30d = 0;
  if (!uniqueActorsResult.error && uniqueActorsResult.data != null) {
    uniqueActors30d = Number(uniqueActorsResult.data);
  } else {
    const { data: actorRows } = await admin
      .from("platform_audit_log")
      .select("actor_user_id")
      .gte("created_at", thirtyDaysAgo.toISOString());
    uniqueActors30d = new Set((actorRows ?? []).map((r) => r.actor_user_id)).size;
  }

  const categoryCounts = computeAuditCategoryCounts(actionCounts);

  return {
    total: totalResult.count ?? 0,
    last7Days: recentResult.count ?? 0,
    uniqueActors30d,
    actionCounts,
    categoryCounts,
    topAction: actionCounts[0] ?? null,
  };
}

export async function fetchAdminAuditPageData(
  filters: AdminAuditFilters = {},
): Promise<AdminAuditPageData> {
  const [auditResult, stats] = await Promise.all([
    fetchAdminAuditLogPaginated(filters),
    fetchAdminAuditOverviewStats(),
  ]);

  return {
    entries: auditResult.entries,
    total: auditResult.total,
    stats,
  };
}
