"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { useSupabase } from "@/providers/supabase-provider";

export function PortalShell({
  organizationName,
  logoUrl,
  children,
}: {
  organizationName: string;
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-foreground/8">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- venue logo, arbitrary host
              <img src={logoUrl} alt="" className="size-8 rounded-md object-contain" />
            ) : null}
            <span className="font-heading text-lg font-semibold">{organizationName}</span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => void logout()}>
            <LogOut className="size-4" aria-hidden />
            {t("portal.nav.logout")}
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
