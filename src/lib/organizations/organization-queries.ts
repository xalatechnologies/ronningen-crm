import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_SUBSCRIPTION_PLAN,
  DEFAULT_SUBSCRIPTION_STATUS,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type UserRole,
} from "@/constants/roles";
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

function mapOrganization(row: {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  subscription_status: string;
  subscription_plan: string;
}): OrganizationSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    subscriptionStatus: row.subscription_status as SubscriptionStatus,
    subscriptionPlan: row.subscription_plan as SubscriptionPlan,
  };
}

export async function fetchUserOrganizations(
  supabase: Client,
  userId: string,
): Promise<OrganizationMembership[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "role, organization_id, organizations ( id, name, slug, logo_url, subscription_status, subscription_plan )",
    )
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const org = row.organizations;
      if (!org || Array.isArray(org)) return null;
      const role = isUserRole(row.role) ? row.role : null;
      if (!role) return null;
      return {
        organizationId: row.organization_id,
        role,
        organization: mapOrganization(org),
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

  if (error) throw error;
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

  if (error) throw error;

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

function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ");
}

export async function createOrganizationForUser(
  supabase: Client,
  userId: string,
  name: string,
): Promise<OrganizationSummary> {
  const existing = await fetchUserOrganizations(supabase, userId);
  if (existing.length > 0) {
    const org = existing[0]!.organization;
    await setActiveOrganizationId(supabase, userId, existing[0]!.organizationId);
    return org;
  }

  const slugBase = slugifyOrganizationName(name);
  let slug = slugBase;
  let attempt = 0;

  while (attempt < 5) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: name.trim(),
        slug,
        subscription_status: DEFAULT_SUBSCRIPTION_STATUS,
        subscription_plan: DEFAULT_SUBSCRIPTION_PLAN,
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
        throw new Error(
          formatSupabaseError(memberError) || "Kunne ikke legge deg til som eier.",
        );
      }

      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .insert({
          organization_id: org.id,
          plan: DEFAULT_SUBSCRIPTION_PLAN,
          status: DEFAULT_SUBSCRIPTION_STATUS,
        });

      if (subscriptionError) {
        throw new Error(
          formatSupabaseError(subscriptionError) ||
            "Kunne ikke opprette abonnement.",
        );
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ active_organization_id: org.id })
        .eq("id", userId);

      if (profileError) {
        throw new Error(
          formatSupabaseError(profileError) ||
            "Kunne ikke lagre aktiv organisasjon.",
        );
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, org.id);
      }

      return mapOrganization(org);
    }

    if (orgError?.code === "23505") {
      attempt += 1;
      slug = `${slugBase}-${attempt}`;
      continue;
    }

    throw new Error(
      formatSupabaseError(orgError ?? {}) || "Kunne ikke opprette organisasjon.",
    );
  }

  throw new Error(
    "Navnet er allerede tatt. Prøv et annet organisasjonsnavn.",
  );
}
