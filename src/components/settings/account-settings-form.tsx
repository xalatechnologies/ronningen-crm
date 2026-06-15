"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/hooks/use-auth-user";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { KeyRound, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const labelClass =
  "text-app-xs font-semibold uppercase tracking-wider text-muted-foreground";
const fieldClass =
  "h-12 rounded-md border-2 border-rn-border-strong bg-background px-4 text-base focus-visible:border-success focus-visible:ring-success/25 md:h-12";

export function AccountSettingsForm({
  initialFullName,
  email,
}: {
  initialFullName: string;
  email: string;
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const { user } = useAuthUser();
  const [fullName, setFullName] = useState(initialFullName);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const displayEmail = user?.email ?? email;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;

    setBusy(true);
    try {
      const trimmed = fullName.trim();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed || null })
        .eq("id", user.id);

      if (error) {
        toast.error("Kunne ikke lagre", { description: error.message });
        return;
      }

      toast.success("Profil oppdatert");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onPasswordReset() {
    if (!supabase || !displayEmail) return;
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(displayEmail, {
        redirectTo: `${window.location.origin}/auth/login`,
      });
      if (error) {
        toast.error("Kunne ikke sende e-post", { description: error.message });
        return;
      }
      toast.success("Sjekk e-posten din for lenke til å endre passord");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <form
        onSubmit={(e) => void onSave(e)}
        className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6")}
      >
        <div className="flex items-start gap-3 border-b border-rn-border-strong/50 pb-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rn-border-strong/70 bg-muted/30 text-muted-foreground">
            <UserRound className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
              Profil
            </h2>
            <p className="mt-1 text-app-sm text-muted-foreground">
              Navnet vises i appen og på dokumenter du sender.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="acct-name" className={labelClass}>
              Fullt navn
            </Label>
            <Input
              id="acct-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={fieldClass}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acct-email" className={labelClass}>
              E-post
            </Label>
            <Input
              id="acct-email"
              value={displayEmail}
              readOnly
              disabled
              className={cn(fieldClass, "bg-muted/40 text-muted-foreground")}
            />
            <p className="text-app-sm leading-relaxed text-muted-foreground">
              E-post endres via innloggingstjenesten.{" "}
              <Link
                href="/app/settings/support"
                className="font-semibold text-success hover:underline"
              >
                Gå til support
              </Link>{" "}
              ved behov.
            </p>
          </div>
        </div>

        <div className="border-t border-rn-border-strong/50 pt-5">
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={busy}
            className="w-full sm:w-auto"
          >
            {busy ? "Lagrer…" : "Lagre navn"}
          </Button>
        </div>
      </form>

      <section className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6")}>
        <div className="flex items-start gap-3 border-b border-rn-border-strong/50 pb-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rn-border-strong/70 bg-muted/30 text-muted-foreground">
            <KeyRound className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
              Passord
            </h2>
            <p className="mt-1 text-app-sm text-muted-foreground">
              Endre passordet ditt via en sikker lenke på e-post.
            </p>
          </div>
        </div>

        <p className="text-app-sm leading-relaxed text-muted-foreground">
          Vi sender en engangslenke til{" "}
          <span className="font-medium text-foreground">{displayEmail}</span>.
          Lenken åpner en side der du kan sette et nytt passord.
        </p>

        <div className="mt-auto border-t border-rn-border-strong/50 pt-5">
          <Button
            type="button"
            variant="outline"
            size="cta"
            className="w-full border-2 border-rn-border-strong sm:w-auto"
            disabled={resetBusy || !displayEmail}
            onClick={() => void onPasswordReset()}
          >
            {resetBusy ? "Sender…" : "Send lenke for nytt passord"}
          </Button>
        </div>
      </section>
    </div>
  );
}
