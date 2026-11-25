import { redirect } from "next/navigation";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { SetupProgress } from "@/components/organizations/setup-progress";
import { SetupSignOut } from "@/components/organizations/setup-sign-out";
import { getServerTranslation } from "@/i18n/server";
import { fetchUserOrganizations } from "@/lib/organizations/organization-queries";
import { resolvePostAuthRedirect } from "@/lib/organizations/tenant-setup-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const steps = [
    t("appPages.onboarding.steps.organization"),
    t("appPages.onboarding.steps.details"),
    t("appPages.onboarding.steps.venues"),
  ];

  return (
    <AuthSplitLayout
      heading={t("appPages.onboarding.panelHeading")}
      body={t("appPages.onboarding.panelBody")}
      points={steps}
    >
      <div className="space-y-10">
        <SetupProgress steps={steps} current={1} label={t("appPages.onboarding.stepOf", { current: 1, total: steps.length })} />
        <div className="space-y-2">
          <h1 className="font-heading text-app-3xl font-bold tracking-tight text-foreground">
            {t("appPages.onboarding.heading")}
          </h1>
          <p className="text-app-base text-muted-foreground">{t("appPages.onboarding.createOrgDescription")}</p>
        </div>
        <CreateOrganizationForm />
        <SetupSignOut />
      </div>
    </AuthSplitLayout>
  );
}
