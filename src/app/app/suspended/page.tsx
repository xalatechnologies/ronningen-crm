"use client";

import { Button } from "@/components/ui/button";
import { signOutToLogin } from "@/lib/auth/sign-out";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import Link from "next/link";

export default function SuspendedPage() {
  const { currentOrganization } = useCurrentOrganization();
  const supabase = useSupabase();

  async function signOut() {
    await signOutToLogin(supabase);
  }

  const reason =
    currentOrganization?.suspendedReason?.trim() ||
    "Organisasjonen er midlertidig suspendert av plattformadministrator.";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div
        className={cn(
          RN_CARD_SHELL,
          "w-full max-w-xl space-y-6 p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.5rem)]",
        )}
      >
        <div>
          <h1 className="app-title">Tilgang suspendert</h1>
          <p className="mt-3 app-text text-muted-foreground">{reason}</p>
          {currentOrganization ? (
            <p className="mt-2 app-text-secondary">
              Organisasjon:{" "}
              <span className="font-semibold text-foreground">
                {currentOrganization.name}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/app/settings/support" />} size="cta">
            Kontakt support
          </Button>
          <Button type="button" variant="outline" size="cta" onClick={() => void signOut()}>
            Logg ut
          </Button>
        </div>
      </div>
    </div>
  );
}
