"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/hooks/use-auth-user";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AccountSettingsForm({
  initialFullName,
}: {
  initialFullName: string;
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const { user } = useAuthUser();
  const [fullName, setFullName] = useState(initialFullName);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

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
    if (!supabase || !user?.email) return;
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
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
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => void onSave(e)}
        className={cn("flex max-w-xl flex-col gap-4 p-6 md:p-8", RN_CARD_SHELL)}
      >
        <h2 className="font-heading text-lg font-bold">Profil</h2>
        <div className="space-y-2">
          <Label htmlFor="acct-name">Fullt navn</Label>
          <Input
            id="acct-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-12 rounded-md border-2 border-rn-border-strong"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acct-email">E-post</Label>
          <Input
            id="acct-email"
            value={user?.email ?? ""}
            readOnly
            disabled
            className="h-12 rounded-md border-2 border-rn-border-strong bg-muted/40"
          />
          <p className="text-xs text-muted-foreground">
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
        <Button type="submit" variant="success" size="cta" disabled={busy} className="w-fit">
          {busy ? "Lagrer…" : "Lagre navn"}
        </Button>
      </form>

      <div className={cn("max-w-xl p-6 md:p-8", RN_CARD_SHELL)}>
        <h2 className="font-heading text-lg font-bold">Passord</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vi sender en sikker lenke til din e-post for å endre passord.
        </p>
        <Button
          type="button"
          variant="outline"
          size="cta"
          className="mt-4 border-2 border-rn-border-strong"
          disabled={resetBusy || !user?.email}
          onClick={() => void onPasswordReset()}
        >
          {resetBusy ? "Sender…" : "Send lenke for nytt passord"}
        </Button>
      </div>
    </div>
  );
}
