import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getInitialSubscriptionPlan,
  getInitialSubscriptionStatus,
} from "@/lib/billing/constants";
import type { SubscriptionPlan, SubscriptionStatus, UserRole } from "@/constants/roles";
import { isUserRole } from "@/lib/validations";
import type { Database } from "@/types/database.types";

import {
  ACTIVE_ORGANIZATION_STORAGE_KEY,
  type OrganizationMembership,
  type OrganizationSummary,
} from "./types";

type Client = SupabaseClient<Database>;

function slugifyOrganizationName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base || "organisasjon";
}

function mapOrganization(
  row: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    subscription_status: string;
    subscription_plan: string;
    is_suspended?: boolean;
    suspended_reason?: string | null;
  },
  subscription?: {
    current_period_end: string | null;
    provider_subscription_id: string | null;
  } | null,
): OrganizationSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    subscriptionStatus: row.subscription_status as SubscriptionStatus,
    subscriptionPlan: row.subscription_plan as SubscriptionPlan,
    isSuspended: row.is_suspended ?? false,
    suspendedReason: row.suspended_reason ?? null,
    periodEnd: subscription?.current_period_end ?? null,
    providerSubscriptionId: subscription?.provider_subscription_id ?? null,
  };
}

function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ");
}

export function toOrganizationError(
  error: unknown,
  fallback: string,
): Error {
  if (error instanceof Error && error.message) {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return new Error(error.message);
  }
  return new Error(fallback);
}

export async function fetchUserOrganizations(
  supabase: Client,
  userId: string,
): Promise<OrganizationMembership[]> {
  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("role, organization_id")
    .eq("user_id", userId);

  if (membersError) {
    throw toOrganizationError(
      membersError,
      "Kunne ikke hente organisasjonsmedlemskap.",
    );
  }

  if (!members?.length) {
    return [];
  }

  const orgIds = members.map((row) => row.organization_id);

  const [{ data: organizations, error: orgsError }, { data: subscriptions }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select(
          "id, name, slug, logo_url, subscription_status, subscription_plan, is_suspended, suspended_reason",
        )
        .in("id", orgIds),
      supabase
        .from("subscriptions")
        .select(
          "organization_id, current_period_end, provider_subscription_id, created_at",
        )
        .in("organization_id", orgIds)
        .order("created_at", { ascending: false }),
    ]);

  if (orgsError) {
    throw toOrganizationError(orgsError, "Kunne ikke hente organisasjoner.");
  }

  const orgById = new Map((organizations ?? []).map((org) => [org.id, org] as const));
  const subscriptionByOrg = new Map<
    string,
    { current_period_end: string | null; provider_subscription_id: string | null }
  >();

  for (const sub of subscriptions ?? []) {
    if (!subscriptionByOrg.has(sub.organization_id)) {
      subscriptionByOrg.set(sub.organization_id, {
        current_period_end: sub.current_period_end,
        provider_subscription_id: sub.provider_subscription_id,
      });
    }
  }

  return members
    .map((member) => {
      const org = orgById.get(member.organization_id);
      if (!org) return null;
      const role = isUserRole(member.role) ? member.role : null;
      if (!role) return null;
      return {
        organizationId: member.organization_id,
        role,
        organization: mapOrganization(
          org,
          subscriptionByOrg.get(member.organization_id) ?? null,
        ),
      } satisfies OrganizationMembership;
    })
    .filter((row): row is OrganizationMembership => row !== null);
}

export async function fetchActiveOrganizationId(
  supabase: Client,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw toOrganizationError(error, "Kunne ikke hente aktiv organisasjon.");
  }
  return data?.active_organization_id ?? null;
}

export async function setActiveOrganizationId(
  supabase: Client,
  userId: string,
  organizationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ active_organization_id: organizationId })
    .eq("id", userId);

  if (error) {
    throw toOrganizationError(error, "Kunne ikke lagre aktiv organisasjon.");
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
  }
}

export function resolveCurrentOrganization(
  memberships: OrganizationMembership[],
  preferredOrganizationId: string | null,
): {
  organization: OrganizationSummary | null;
  organizationId: string | null;
  role: UserRole | null;
} {
  if (memberships.length === 0) {
    return { organization: null, organizationId: null, role: null };
  }

  const match =
    (preferredOrganizationId
      ? memberships.find((m) => m.organizationId === preferredOrganizationId)
      : null) ?? memberships[0];

  return {
    organization: match.organization,
    organizationId: match.organizationId,
    role: match.role,
  };
}

export type CreateOrganizationResult = {
  organization: OrganizationSummary;
  created: boolean;
};

export async function createOrganizationForUser(
  supabase: Client,
  userId: string,
  name: string,
): Promise<CreateOrganizationResult> {
  const existing = await fetchUserOrganizations(supabase, userId);
  if (existing.length > 0) {
    const membership = existing[0]!;
    await setActiveOrganizationId(supabase, userId, membership.organizationId);
    return { organization: membership.organization, created: false };
  }

  const initialStatus = getInitialSubscriptionStatus();
  const initialPlan = getInitialSubscriptionPlan();

  const slugBase = slugifyOrganizationName(name);
  let slug = slugBase;
  let attempt = 0;

  while (attempt < 5) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: name.trim(),
        slug,
        subscription_status: initialStatus,
        subscription_plan: initialPlan,
      })
      .select("id, name, slug, logo_url, subscription_status, subscription_plan")
      .single();

    if (!orgError && org) {
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: userId,
          role: "owner",
        });

      if (memberError) {
        throw toOrganizationError(
          memberError,
          "Kunne ikke legge deg til som eier.",
        );
      }

      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .insert({
          organization_id: org.id,
          plan: initialPlan,
          status: initialStatus,
        });

      if (subscriptionError) {
        throw toOrganizationError(
          subscriptionError,
          "Kunne ikke opprette abonnement.",
        );
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ active_organization_id: org.id })
        .eq("id", userId);

      if (profileError) {
        throw toOrganizationError(
          profileError,
          "Kunne ikke lagre aktiv organisasjon.",
        );
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, org.id);
      }

      return { organization: mapOrganization(org, null), created: true };
    }

    if (orgError?.code === "23505") {
      attempt += 1;
      slug = `${slugBase}-${attempt}`;
      continue;
    }

    throw toOrganizationError(
      orgError,
      "Kunne ikke opprette organisasjon.",
    );
  }

  throw new Error(
    "Navnet er allerede tatt. Prøv et annet organisasjonsnavn.",
  );
}
