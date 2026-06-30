"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteOwnAccount } from "@/lib/auth/actions/delete-account";
import type { AccountDeletionBlocker } from "@/lib/auth/account-deletion-eligibility";
import { normalizeConfirmEmail } from "@/lib/auth/account-deletion-eligibility";
import { signOutToLogin } from "@/lib/auth/sign-out";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { AlertTriangle } from "lucide-react";

export function AccountDeleteSection({
  email,
  eligible,
  blockers,
}: {
  email: string;
  eligible: boolean;
  blockers: AccountDeletionBlocker[];
}) {
  const supabase = useSupabase();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatches =
    normalizeConfirmEmail(confirmEmail) === normalizeConfirmEmail(email);

  async function handleDelete() {
    if (!emailMatches) {
      setError("E-postadressen stemmer ikke. Skriv inn e-posten din nøyaktig.");
      return;
    }

    setBusy(true);
    setError(null);

    const result = await deleteOwnAccount(confirmEmail);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    toast.success("Kontoen din er slettet");
    setOpen(false);

    if (supabase) {
      await signOutToLogin(supabase);
    } else {
      window.location.assign("/auth/login");
    }
  }

  return (
    <>
      <section
        className={cn(
          RN_CARD_SHELL,
          "border-destructive/30 p-5 md:p-6",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-semibold text-destructive md:text-xl">
              Farlig sone
            </h2>
            <p className="mt-1 text-app-sm leading-relaxed text-muted-foreground">
              Permanent sletting av kontoen din og personlige profildata. Kan ikke
              angres.
            </p>
          </div>
        </div>

        {!eligible && blockers.length > 0 ? (
          <div className="mt-5 space-y-3 rounded-md border border-rn-border-strong/60 bg-muted/20 p-4">
            <p className="text-app-sm font-semibold text-foreground">
              Kontoen kan ikke slettes ennå:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-app-sm text-muted-foreground">
              {blockers.map((blocker) => (
                <li key={`${blocker.code}-${blocker.organizationId ?? "platform"}`}>
                  {blocker.message}
                </li>
              ))}
            </ul>
            <p className="text-app-sm text-muted-foreground">
              Trenger du hjelp?{" "}
              <Link
                href="/app/settings/team"
                className="font-semibold text-success hover:underline"
              >
                Gå til Team
              </Link>{" "}
              eller{" "}
              <Link
                href="/app/settings/support"
                className="font-semibold text-success hover:underline"
              >
                kontakt support
              </Link>
              .
            </p>
          </div>
        ) : (
          <p className="mt-5 text-app-sm leading-relaxed text-muted-foreground">
            Du mister tilgang til alle organisasjoner, profilen din slettes, og
            medlemskapene dine fjernes. Organisasjonsdata som andre brukere har
            tilgang til, beholdes.
          </p>
        )}

        <div className="mt-5 border-t border-rn-border-strong/50 pt-5">
          <Button
            type="button"
            variant="destructive"
            size="cta"
            disabled={!eligible}
            onClick={() => {
              setConfirmEmail("");
              setError(null);
              setOpen(true);
            }}
          >
            Slett kontoen min
          </Button>
          {error && !open ? (
            <p className="mt-3 text-app-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      <ConfirmDeleteDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!busy) setOpen(nextOpen);
        }}
        title="Slett kontoen din permanent?"
        description={
          <div className="space-y-4">
            <p>
              Dette sletter kontoen din permanent. Du mister tilgang til appen,
              profilen din slettes, og medlemskapene dine fjernes.
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete-email">
                Skriv inn e-postadressen din for å bekrefte
              </Label>
              <Input
                id="confirm-delete-email"
                type="email"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                placeholder={email}
                autoComplete="off"
                disabled={busy}
              />
              <p className="text-app-sm text-muted-foreground">
                Bekreft med:{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            {error ? (
              <p className="text-app-sm font-medium text-destructive">{error}</p>
            ) : null}
          </div>
        }
        confirmLabel="Ja, slett kontoen min"
        busy={busy}
        onConfirm={handleDelete}
      />
    </>
  );
}
