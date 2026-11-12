"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";
import { acceptPortalInvite } from "@/lib/portal/actions";
import type { PortalInviteState } from "@/lib/portal/rules";
import { validationMessagesForLocale } from "@/lib/validations";
import { useSupabase } from "@/providers/supabase-provider";

type Invitation = { organizationName: string; email: string; state: PortalInviteState };

const fieldClass =
  "h-12 rounded-xl border border-foreground/25 bg-background px-4 text-app-base hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20";

export function PortalInviteAccept({
  token,
  invitation,
  signedInEmail,
}: {
  token: string;
  invitation: Invitation | null;
  signedInEmail: string | null;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const supabase = useSupabase();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateMessage = !invitation
    ? t("portal.invite.stateInvalid")
    : invitation.state === "expired"
      ? t("portal.invite.stateExpired")
      : invitation.state === "revoked"
        ? t("portal.invite.stateRevoked")
        : invitation.state === "accepted"
          ? t("portal.invite.stateAccepted")
          : null;

  const loginHref = `/auth/login?redirect=${encodeURIComponent(`/portal/invite/${token}`)}`;
  const wrongAccount =
    invitation && signedInEmail && signedInEmail.trim().toLowerCase() !== invitation.email;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!signedInEmail) {
      if (!fullName.trim()) return setError(validationMessagesForLocale(locale).nameRequired);
      if (password.length < 8) return setError(validationMessagesForLocale(locale).passwordTooShort);
      if (password !== confirm) return setError(validationMessagesForLocale(locale).passwordsMismatch);
    }
    setBusy(true);
    const result = await acceptPortalInvite({
      token,
      fullName: signedInEmail ? undefined : fullName,
      password: signedInEmail ? undefined : password,
    });
    if (result.ok) {
      window.location.assign(result.redirectTo);
      return;
    }
    setBusy(false);
    setError(
      result.code === "account_exists"
        ? t("portal.invite.accountExists")
        : result.code === "wrong_account"
          ? t("portal.invite.wrongAccount", { email: invitation?.email ?? "" })
          : result.code === "invalid"
            ? t("portal.invite.stateInvalid")
            : t("portal.invite.failed"),
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-5 py-12 text-foreground">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-card p-6 ring-1 ring-foreground/8 sm:p-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t("portal.invite.title")}</h1>

        {stateMessage || !invitation ? (
          <>
            <p className="text-muted-foreground">{stateMessage}</p>
            <Link href="/auth/login" className={buttonVariants({ variant: "outline", size: "cta" })}>
              {t("portal.invite.goToLogin")}
            </Link>
          </>
        ) : wrongAccount ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-app-sm">
              {t("portal.invite.signedInAs", { email: signedInEmail ?? "" })}{" "}
              {t("portal.invite.wrongAccount", { email: invitation.email })}
            </p>
            <Button type="button" variant="outline" size="cta" onClick={() => void logout()}>
              {t("portal.invite.logout")}
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              {t("portal.invite.lead", { org: invitation.organizationName })}
            </p>
            {signedInEmail ? (
              <p className="text-app-sm text-muted-foreground">
                {t("portal.invite.signedInAs", { email: signedInEmail })}
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="portal-email">{t("portal.invite.email")}</Label>
                  <Input id="portal-email" value={invitation.email} readOnly disabled className={fieldClass} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="portal-name">{t("portal.invite.fullName")}</Label>
                  <Input
                    id="portal-name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="portal-password">{t("portal.invite.password")}</Label>
                  <Input
                    id="portal-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldClass}
                  />
                  <p className="text-app-xs text-muted-foreground">{t("portal.invite.passwordHint")}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="portal-confirm">{t("portal.invite.confirmPassword")}</Label>
                  <Input
                    id="portal-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </>
            )}

            {error ? <p className="text-app-sm font-medium text-destructive">{error}</p> : null}

            <Button type="submit" variant="success" size="cta" disabled={busy} className="w-full">
              {signedInEmail ? t("portal.invite.accept") : t("portal.invite.createAndAccept")}
            </Button>

            {!signedInEmail ? (
              <p className="text-center text-app-sm text-muted-foreground">
                {t("portal.invite.haveAccount")}{" "}
                <Link href={loginHref} className="font-semibold text-success underline underline-offset-2 dark:!text-white">
                  {t("portal.invite.login")}
                </Link>
              </p>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}
