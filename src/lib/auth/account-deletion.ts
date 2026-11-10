import "server-only";

import { logAdminAction } from "@/lib/admin/audit-log";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import {
  evaluateAccountDeletionEligibility,
  normalizeConfirmEmail,
  type AccountDeletionEligibility,
  type MembershipEligibilityInput,
} from "@/lib/auth/account-deletion-eligibility";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { getServerTranslation } from "@/i18n/server";

export type {
  AccountDeletionBlocker,
  AccountDeletionBlockerCode,
  AccountDeletionEligibility,
} from "@/lib/auth/account-deletion-eligibility";

export { normalizeConfirmEmail } from "@/lib/auth/account-deletion-eligibility";

export async function getAccountDeletionEligibility(
  userId: string,
): Promise<AccountDeletionEligibility> {
  const { t } = await getServerTranslation();
  const admin = createSupabaseAdminClient();

  const [{ data: memberships, error: membershipsError }, { data: profile }] =
    await Promise.all([
      admin
        .from("organization_members")
        .select("organization_id, role, organizations(name)")
        .eq("user_id", userId),
      admin
        .from("profiles")
        .select("is_platform_admin")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const ownerOrgIds = (memberships ?? [])
    .filter((row) => row.role === "owner")
    .map((row) => row.organization_id);

  const countsByOrg = new Map<
    string,
    { memberCount: number; ownerCount: number }
  >();

  if (ownerOrgIds.length > 0) {
    const { data: orgMembers, error: orgMembersError } = await admin
      .from("organization_members")
      .select("organization_id, role")
      .in("organization_id", ownerOrgIds);

    if (orgMembersError) {
      throw new Error(orgMembersError.message);
    }

    for (const row of orgMembers ?? []) {
      const current = countsByOrg.get(row.organization_id) ?? {
        memberCount: 0,
        ownerCount: 0,
      };
      current.memberCount += 1;
      if (row.role === "owner") current.ownerCount += 1;
      countsByOrg.set(row.organization_id, current);
    }
  }

  const { count: platformAdminCount, error: platformAdminError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_platform_admin", true);

  if (platformAdminError) {
    throw new Error(platformAdminError.message);
  }

  const membershipInputs: MembershipEligibilityInput[] = (memberships ?? []).map(
    (row) => {
      const org = row.organizations as { name?: string } | null;
      const counts = countsByOrg.get(row.organization_id) ?? {
        memberCount: 1,
        ownerCount: row.role === "owner" ? 1 : 0,
      };
      return {
        organizationId: row.organization_id,
        organizationName: org?.name?.trim() || t("organizations.defaultName"),
        role: row.role,
        memberCount: counts.memberCount,
        ownerCount: counts.ownerCount,
      };
    },
  );

  return evaluateAccountDeletionEligibility({
    memberships: membershipInputs,
    isPlatformAdmin: profile?.is_platform_admin ?? false,
    platformAdminCount: platformAdminCount ?? 0,
  }, t);
}

export async function deleteUserAccount(input: {
  userId: string;
  confirmEmail: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { t } = await getServerTranslation();
  const admin = createSupabaseAdminClient();

  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(input.userId);

  if (authError || !authData.user) {
    return { ok: false, error: "Kontoen ble ikke funnet." };
  }

  const accountEmail = authData.user.email?.trim();
  if (!accountEmail) {
    return { ok: false, error: "Kontoen har ingen e-postadresse." };
  }

  if (normalizeConfirmEmail(input.confirmEmail) !== normalizeEmail(accountEmail)) {
    return {
      ok: false,
      error: t("serverErrors.auth.emailMismatch"),
    };
  }

  let eligibility: AccountDeletionEligibility;
  try {
    eligibility = await getAccountDeletionEligibility(input.userId);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Kunne ikke kontrollere om kontoen kan slettes.",
    };
  }

  if (!eligibility.eligible) {
    return {
      ok: false,
      error: eligibility.blockers[0]?.message ?? t("serverErrors.auth.accountCannotDeleteYet"),
    };
  }

  await logAdminAction({
    actorUserId: input.userId,
    action: "user.self_deleted",
    targetType: "user",
    targetId: input.userId,
    metadata: { email: accountEmail },
  });

  const { error: deleteError } = await admin.auth.admin.deleteUser(input.userId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  return { ok: true };
}
