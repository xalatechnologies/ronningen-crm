"use server";

import { revalidatePath } from "next/cache";

import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { formInputToOrganizationUpdate } from "@/lib/organizations/organization-profile";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import { getServerT } from "@/lib/i18n/server-messages";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { organizationProfileFormSchema, type OrganizationProfileFormInput } from "@/lib/validations";

export type UpdateOrganizationProfileResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof OrganizationProfileFormInput, string>> };

/**
 * Saves the organization profile. The organization is always the one of the signed-in session (never a value
 * from the request), only owners and admins may save, the input is validated here as well as in the form,
 * and only the profile columns are written, so billing and suspension fields can never be changed from here.
 */
export async function updateOrganizationProfile(input: unknown): Promise<UpdateOrganizationProfileResult> {
  const [{ organizationId, role }, supabase, t] = await Promise.all([
    getCachedServerOrganizationContext(),
    getCachedServerSupabaseClient(),
    getServerT(),
  ]);

  if (!organizationId || !role) return { ok: false, error: t("organizations.noActiveOrg") };
  if (!canManageMembers(role)) return { ok: false, error: t("serverErrors.billing.mustBeOwner") };

  const parsed = organizationProfileFormSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof OrganizationProfileFormInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof OrganizationProfileFormInput | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { ok: false, error: t("common.toasts.saveFailed"), fieldErrors };
  }

  const { error } = await supabase
    .from("organizations")
    .update(formInputToOrganizationUpdate(parsed.data))
    .eq("id", organizationId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app", "layout");
  revalidatePath("/app/settings");
  revalidatePath("/app/settings/organization");
  return { ok: true };
}
