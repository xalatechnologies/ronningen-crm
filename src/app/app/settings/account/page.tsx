import { AccountDeleteSection } from "@/components/settings/account-delete-section";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { getAccountDeletionEligibility } from "@/lib/auth/account-deletion";
import { getServerTranslation } from "@/i18n/server";
import { getCachedServerAuthUser } from "@/lib/supabase/cached-server-auth";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const { t } = await getServerTranslation();
  const [supabase, user] = await Promise.all([
    getCachedServerSupabaseClient(),
    getCachedServerAuthUser(),
  ]);

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const deletionEligibility = await getAccountDeletionEligibility(user.id);

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("appPages.settings.account.title")}
        description={t("appPages.settings.account.description")}
      />
      <AccountSettingsForm
        initialFullName={profile?.full_name ?? ""}
        email={user.email ?? ""}
      />
      <AccountDeleteSection
        email={user.email ?? ""}
        eligible={deletionEligibility.eligible}
        blockers={deletionEligibility.blockers}
      />
    </div>
  );
}
