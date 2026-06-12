import { AccountSettingsForm } from "@/components/settings/account-settings-form";
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
      <div>
        <h1 className="app-title">Min konto</h1>
        <p className="mt-2 text-app-base text-muted-foreground">
          Ditt navn og innloggingsinformasjon.
        </p>
      </div>
      <AccountSettingsForm initialFullName={profile?.full_name ?? ""} />
    </div>
  );
}
