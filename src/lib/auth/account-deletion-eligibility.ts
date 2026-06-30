import { normalizeEmail } from "@/lib/auth/normalize-email";

export type AccountDeletionBlockerCode =
  | "sole_owner_only_member"
  | "sole_owner_transfer_required"
  | "sole_platform_admin";

export type AccountDeletionBlocker = {
  code: AccountDeletionBlockerCode;
  message: string;
  organizationId?: string;
  organizationName?: string;
};

export type AccountDeletionEligibility = {
  eligible: boolean;
  blockers: AccountDeletionBlocker[];
};

export type MembershipEligibilityInput = {
  organizationId: string;
  organizationName: string;
  role: string;
  memberCount: number;
  ownerCount: number;
};

export function normalizeConfirmEmail(value: string): string {
  return normalizeEmail(value);
}

export function evaluateAccountDeletionEligibility(input: {
  memberships: MembershipEligibilityInput[];
  isPlatformAdmin: boolean;
  platformAdminCount: number;
}): AccountDeletionEligibility {
  const blockers: AccountDeletionBlocker[] = [];

  if (input.isPlatformAdmin && input.platformAdminCount <= 1) {
    blockers.push({
      code: "sole_platform_admin",
      message:
        "Du er den eneste plattformadministratoren. Utnevn en annen administrator før du sletter kontoen.",
    });
  }

  for (const membership of input.memberships) {
    if (membership.role !== "owner" || membership.ownerCount > 1) {
      continue;
    }

    if (membership.memberCount <= 1) {
      blockers.push({
        code: "sole_owner_only_member",
        organizationId: membership.organizationId,
        organizationName: membership.organizationName,
        message: `Du er eneste bruker og hovedeier i «${membership.organizationName}». Inviter et nytt teammedlem eller kontakt support for å avslutte organisasjonen før du sletter kontoen.`,
      });
      continue;
    }

    blockers.push({
      code: "sole_owner_transfer_required",
      organizationId: membership.organizationId,
      organizationName: membership.organizationName,
      message: `Du er siste hovedeier i «${membership.organizationName}». Eierskap må overføres før du sletter kontoen. Kontakt support for hjelp.`,
    });
  }

  return { eligible: blockers.length === 0, blockers };
}
