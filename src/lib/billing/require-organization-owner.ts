import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OrganizationOwnerContext = {
  userId: string;
  email: string | null;
};

export async function requireOrganizationOwner(
  organizationId: string,
): Promise<
  | { ok: true; owner: OrganizationOwnerContext }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Du må være innlogget." };
  }

  const { data: member, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!member || member.role !== "owner") {
    return { ok: false, error: "Kun organisasjonseier kan administrere abonnement." };
  }

  return {
    ok: true,
    owner: { userId: user.id, email: user.email ?? null },
  };
}
