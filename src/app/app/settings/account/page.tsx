import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title="Min konto"
        description="Ditt navn og innloggingsinformasjon."
      />
      <AccountSettingsForm
        initialFullName={profile?.full_name ?? ""}
        email={user.email ?? ""}
      />
    </div>
  );
}
