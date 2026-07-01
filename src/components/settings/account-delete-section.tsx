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
import { useTranslation } from "@/i18n/client";
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
  const { t } = useTranslation();
  const supabase = useSupabase();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatches =
    normalizeConfirmEmail(confirmEmail) === normalizeConfirmEmail(email);

  async function handleDelete() {
    if (!emailMatches) {
      setError(t("settings.account.emailMismatch"));
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

    toast.success(t("settings.deleteAccount.deleted"));
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
              {t("settings.deleteAccount.dangerZone")}
            </h2>
            <p className="mt-1 text-app-sm leading-relaxed text-muted-foreground">
              {t("settings.deleteAccount.description")}
            </p>
          </div>
        </div>

        {!eligible && blockers.length > 0 ? (
          <div className="mt-5 space-y-3 rounded-md border border-rn-border-strong/60 bg-muted/20 p-4">
            <p className="text-app-sm font-semibold text-foreground">
              {t("settings.deleteAccount.cannotDelete")}
            </p>
            <ul className="list-disc space-y-2 pl-5 text-app-sm text-muted-foreground">
              {blockers.map((blocker) => (
                <li key={`${blocker.code}-${blocker.organizationId ?? "platform"}`}>
                  {blocker.message}
                </li>
              ))}
            </ul>
            <p className="text-app-sm text-muted-foreground">
              {t("settings.deleteAccount.needHelp")}{" "}
              <Link
                href="/app/settings/team"
                className="font-semibold text-success hover:underline"
              >
                {t("settings.deleteAccount.goToTeam")}
              </Link>{" "}
              {t("settings.deleteAccount.or")}{" "}
              <Link
                href="/app/settings/support"
                className="font-semibold text-success hover:underline"
              >
                {t("settings.deleteAccount.contactSupport")}
              </Link>
              .
            </p>
          </div>
        ) : (
          <p className="mt-5 text-app-sm leading-relaxed text-muted-foreground">
            {t("settings.deleteAccount.eligibleDescription")}
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
            {t("settings.deleteAccount.deleteButton")}
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
        title={t("settings.deleteAccount.confirmTitle")}
        description={
          <div className="space-y-4">
            <p>{t("settings.deleteAccount.confirmDescription")}</p>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete-email">
                {t("settings.deleteAccount.confirmEmailLabel")}
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
                {t("settings.deleteAccount.confirmWith")}{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            {error ? (
              <p className="text-app-sm font-medium text-destructive">{error}</p>
            ) : null}
          </div>
        }
        confirmLabel={t("settings.deleteAccount.confirmButton")}
        busy={busy}
        onConfirm={handleDelete}
      />
    </>
  );
}
