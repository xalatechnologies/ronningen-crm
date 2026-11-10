import { computeHealthScore } from "@/lib/admin/health-score";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { HealthScoreResult } from "@/lib/admin/types";

export type AdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  isSuspended: boolean;
  createdAt: string;
  memberCount: number;
  venueCount: number;
  trialEnds: string | null;
  providerSubscriptionId: string | null;
  lastActivityAt: string | null;
  totalRevenue: number;
  unpaidRemaining: number;
  bookingsLast30d: number;
  health: HealthScoreResult;
  billingEmail: string | null;
  contactEmail: string | null;
  orgNumber: string | null;
};

export async function fetchAdminOrganizations(): Promise<AdminOrganizationRow[]> {
  const admin = createSupabaseAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  const { data: orgs, error } = await admin
    .from("organizations")
    .select(
      "id, name, slug, subscription_status, subscription_plan, is_suspended, created_at, last_activity_at, billing_email, contact_email, org_number",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const [
    { data: memberCounts },
    { data: subscriptions },
    { data: properties },
    { data: bookings },
  ] = await Promise.all([
    admin.from("organization_members").select("organization_id"),
    admin
      .from("subscriptions")
      .select(
        "organization_id, current_period_end, provider_subscription_id, created_at",
      )
      .order("created_at", { ascending: false }),
    admin.from("properties").select("organization_id"),
    admin
      .from("bookings")
      .select("organization_id, total_price, remaining_amount, created_at"),
  ]);

  const countByOrg = new Map<string, number>();
  for (const row of memberCounts ?? []) {
    countByOrg.set(
      row.organization_id,
      (countByOrg.get(row.organization_id) ?? 0) + 1,
    );
  }

  const periodEndByOrg = new Map<string, string | null>();
  const stripeSubByOrg = new Map<string, string | null>();
  for (const sub of subscriptions ?? []) {
    if (!periodEndByOrg.has(sub.organization_id)) {
      periodEndByOrg.set(sub.organization_id, sub.current_period_end);
      stripeSubByOrg.set(
        sub.organization_id,
        sub.provider_subscription_id ?? null,
      );
    }
  }

  const venueCountByOrg = new Map<string, number>();
  for (const p of properties ?? []) {
    venueCountByOrg.set(
      p.organization_id,
      (venueCountByOrg.get(p.organization_id) ?? 0) + 1,
    );
  }

  const revenueByOrg = new Map<string, number>();
  const unpaidByOrg = new Map<string, number>();
  const bookings30ByOrg = new Map<string, number>();
  for (const b of bookings ?? []) {
    revenueByOrg.set(
      b.organization_id,
      (revenueByOrg.get(b.organization_id) ?? 0) + Number(b.total_price ?? 0),
    );
    unpaidByOrg.set(
      b.organization_id,
      (unpaidByOrg.get(b.organization_id) ?? 0) +
        Number(b.remaining_amount ?? 0),
    );
    if (b.created_at >= since) {
      bookings30ByOrg.set(
        b.organization_id,
        (bookings30ByOrg.get(b.organization_id) ?? 0) + 1,
      );
    }
  }

  return (orgs ?? []).map((o) => {
    const health = computeHealthScore({
      subscriptionStatus: o.subscription_status,
      isSuspended: o.is_suspended,
      memberCount: countByOrg.get(o.id) ?? 0,
      bookingsLast30d: bookings30ByOrg.get(o.id) ?? 0,
      totalRevenue: revenueByOrg.get(o.id) ?? 0,
      unpaidRemaining: unpaidByOrg.get(o.id) ?? 0,
      lastActivityAt: o.last_activity_at,
    });

    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      subscriptionStatus: o.subscription_status,
      subscriptionPlan: o.subscription_plan,
      isSuspended: o.is_suspended,
      createdAt: o.created_at,
      memberCount: countByOrg.get(o.id) ?? 0,
      venueCount: venueCountByOrg.get(o.id) ?? 0,
      trialEnds: periodEndByOrg.get(o.id) ?? null,
      providerSubscriptionId: stripeSubByOrg.get(o.id) ?? null,
      lastActivityAt: o.last_activity_at,
      totalRevenue: revenueByOrg.get(o.id) ?? 0,
      unpaidRemaining: unpaidByOrg.get(o.id) ?? 0,
      bookingsLast30d: bookings30ByOrg.get(o.id) ?? 0,
      health,
      billingEmail: o.billing_email,
      contactEmail: o.contact_email,
      orgNumber: o.org_number,
    };
  });
}

export type AdminOrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  billingExempt: boolean;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  legalName: string | null;
  orgNumber: string | null;
  contactEmail: string | null;
  billingEmail: string | null;
  subscriptionPeriodEnd: string | null;
  subscriptionPeriodStart: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerPriceId: string | null;
  cancelAtPeriodEnd: boolean;
  lastSyncedAt: string | null;
  trialEndsAt: string | null;
  members: {
    userId: string;
    email: string | null;
    fullName: string | null;
    role: string;
    joinedAt: string;
  }[];
  bookingCount: number;
  inquiryCount: number;
  customerCount: number;
  totalRevenue: number;
  unpaidRemaining: number;
  lastActivityAt: string | null;
  bookingsLast30d: number;
  health: HealthScoreResult;
};

export async function fetchAdminOrganizationDetail(
  organizationId: string,
): Promise<AdminOrganizationDetail | null> {
  const admin = createSupabaseAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  const { data: org, error } = await admin
    .from("organizations")
    .select(
      "id, name, slug, subscription_status, subscription_plan, is_suspended, suspended_at, suspended_reason, admin_notes, created_at, updated_at, legal_name, org_number, contact_email, billing_email, last_activity_at, trial_ends_at, billing_exempt",
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!org) return null;

  const [
    { data: members },
    { count: bookingCount },
    { count: inquiryCount },
    { count: customerCount },
    { data: subscription },
    { data: bookings },
  ] = await Promise.all([
    admin
      .from("organization_members")
      .select("user_id, role, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    admin
      .from("booking_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    admin
      .from("subscriptions")
      .select(
        "current_period_end, current_period_start, provider_customer_id, provider_subscription_id, provider_price_id, cancel_at_period_end, last_synced_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("bookings")
      .select("total_price, remaining_amount, created_at")
      .eq("organization_id", organizationId),
  ]);

  let totalRevenue = 0;
  let unpaidRemaining = 0;
  let bookingsLast30d = 0;
  for (const b of bookings ?? []) {
    totalRevenue += Number(b.total_price ?? 0);
    unpaidRemaining += Number(b.remaining_amount ?? 0);
    if (b.created_at >= since) bookingsLast30d += 1;
  }

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
      : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p] as const),
  );

  const health = computeHealthScore({
    subscriptionStatus: org.subscription_status,
    isSuspended: org.is_suspended,
    memberCount: members?.length ?? 0,
    bookingsLast30d,
    totalRevenue,
    unpaidRemaining,
    lastActivityAt: org.last_activity_at,
  });

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    subscriptionStatus: org.subscription_status,
    subscriptionPlan: org.subscription_plan,
    isSuspended: org.is_suspended,
    suspendedAt: org.suspended_at,
    suspendedReason: org.suspended_reason,
    billingExempt: org.billing_exempt ?? false,
    adminNotes: org.admin_notes,
    createdAt: org.created_at,
    updatedAt: org.updated_at,
    legalName: org.legal_name,
    orgNumber: org.org_number,
    contactEmail: org.contact_email,
    billingEmail: org.billing_email,
    subscriptionPeriodEnd: subscription?.current_period_end ?? null,
    subscriptionPeriodStart: subscription?.current_period_start ?? null,
    providerCustomerId: subscription?.provider_customer_id ?? null,
    providerSubscriptionId: subscription?.provider_subscription_id ?? null,
    providerPriceId: subscription?.provider_price_id ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    lastSyncedAt: subscription?.last_synced_at ?? null,
    trialEndsAt: org.trial_ends_at ?? null,
    members: (members ?? []).map((m) => {
      const profile = profileById.get(m.user_id);
      return {
        userId: m.user_id,
        email: profile?.email ?? null,
        fullName: profile?.full_name ?? null,
        role: m.role,
        joinedAt: m.created_at,
      };
    }),
    bookingCount: bookingCount ?? 0,
    inquiryCount: inquiryCount ?? 0,
    customerCount: customerCount ?? 0,
    totalRevenue,
    unpaidRemaining,
    lastActivityAt: org.last_activity_at,
    bookingsLast30d,
    health,
  };
}
