import { redirect } from "next/navigation";

import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerTranslation } from "@/i18n/server";
import { fetchUserOrganizations } from "@/lib/organizations/organization-queries";
import { resolvePostAuthRedirect } from "@/lib/organizations/tenant-setup-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { t } = await getServerTranslation();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/app/onboarding");
  }

  try {
    const memberships = await fetchUserOrganizations(supabase, user.id);
    if (memberships.length > 0) {
      redirect(await resolvePostAuthRedirect(supabase, user.id));
    }
  } catch {
    // Fall through to client form — OrganizationProvider will reconcile access.
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-8">
      <Card className={cn(RN_CARD_SHELL)}>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            {t("appPages.onboarding.createOrg")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-app-base text-muted-foreground">
            {t("appPages.onboarding.createOrgDescription")}
          </p>
          <CreateOrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}
