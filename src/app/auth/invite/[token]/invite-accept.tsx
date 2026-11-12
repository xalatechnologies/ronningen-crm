"use client";

import { BrandLockup } from "@/components/brand/brand-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";
import { validationMessagesForLocale } from "@/lib/validations";
import { roleLabel } from "@/lib/navigation/nav-labels";
import { acceptInvitation } from "@/lib/organizations/invitations/actions";
import type { InvitationState } from "@/lib/organizations/invitations/rules";
import { useSupabase } from "@/providers/supabase-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Invitation = {
  organizationName: string;
  inviterName: string | null;
  email: string;
  role: string;
  state: InvitationState;
};

const fieldClass =
  "h-12 rounded-xl border border-foreground/25 bg-background px-4 text-app-base hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20";

export function InviteAccept({
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

  const stateMessage =
    !invitation
      ? t("settings.inviteAccept.stateInvalid")
      : invitation.state === "expired"
        ? t("settings.inviteAccept.stateExpired")
        : invitation.state === "revoked"
          ? t("settings.inviteAccept.stateRevoked")
          : invitation.state === "accepted"
            ? t("settings.inviteAccept.stateAccepted")
            : null;

  const loginHref = `/auth/login?redirect=${encodeURIComponent(`/auth/invite/${token}`)}`;
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
    const result = await acceptInvitation({
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
        ? t("settings.inviteAccept.accountExists")
        : result.code === "wrong_account"
          ? t("settings.inviteAccept.wrongAccount", { email: invitation?.email ?? "" })
          : result.code === "invalid"
            ? t("settings.inviteAccept.stateInvalid")
            : t("settings.inviteAccept.failed"),
    );
  }

  async function logout() {
    await supabase?.auth.signOut();
    router.refresh();
  }

  return (
    <main className="flex min-h-[min(100dvh,100svh)] flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="flex w-full max-w-md flex-col gap-8">
        <Link href="/" className="w-fit self-center">
          <BrandLockup />
        </Link>

        <div className="flex flex-col gap-6 rounded-2xl bg-card p-6 ring-1 ring-foreground/8 sm:p-8">
          {stateMessage || !invitation ? (
            <>
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                {t("settings.inviteAccept.title")}
              </h1>
              <p className="text-muted-foreground">{stateMessage}</p>
              <Link href="/auth/login" className={buttonVariants({ variant: "outline", size: "cta" })}>
                {t("settings.inviteAccept.goToLogin")}
              </Link>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-2xl font-bold tracking-tight">
                  {t("settings.inviteAccept.title")}
                </h1>
                <p className="text-muted-foreground">
                  {invitation.inviterName
                    ? t("settings.inviteAccept.lead", {
                        inviter: invitation.inviterName,
                        org: invitation.organizationName,
                      })
                    : t("settings.inviteAccept.leadNoInviter", { org: invitation.organizationName })}
                </p>
                <p className="w-fit rounded-full bg-success/12 px-3 py-1 text-app-sm font-semibold text-success dark:!text-white">
                  {t("settings.inviteAccept.yourRole")}: {roleLabel(invitation.role, t)}
                </p>
              </div>

              {wrongAccount ? (
                <div className="flex flex-col gap-4">
                  <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-app-sm">
                    {t("settings.inviteAccept.signedInAs", { email: signedInEmail ?? "" })}{" "}
                    {t("settings.inviteAccept.wrongAccount", { email: invitation.email })}
                  </p>
                  <Button type="button" variant="outline" size="cta" onClick={() => void logout()}>
                    {t("settings.inviteAccept.logout")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
                  {signedInEmail ? (
                    <p className="text-app-sm text-muted-foreground">
                      {t("settings.inviteAccept.signedInAs", { email: signedInEmail })}
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="invite-email">{t("settings.inviteAccept.email")}</Label>
                        <Input id="invite-email" value={invitation.email} readOnly disabled className={fieldClass} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="invite-name">{t("settings.inviteAccept.fullName")}</Label>
                        <Input
                          id="invite-name"
                          autoComplete="name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={fieldClass}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="invite-password">{t("settings.inviteAccept.password")}</Label>
                        <Input
                          id="invite-password"
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={fieldClass}
                        />
                        <p className="text-app-xs text-muted-foreground">{t("settings.inviteAccept.passwordHint")}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="invite-confirm">{t("settings.inviteAccept.confirmPassword")}</Label>
                        <Input
                          id="invite-confirm"
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
                    {signedInEmail
                      ? t("settings.inviteAccept.accept")
                      : t("settings.inviteAccept.createAndAccept")}
                  </Button>

                  {!signedInEmail ? (
                    <p className="text-center text-app-sm text-muted-foreground">
                      {t("settings.inviteAccept.haveAccount")}{" "}
                      <Link href={loginHref} className="font-semibold text-success underline underline-offset-2 dark:!text-white">
                        {t("settings.inviteAccept.login")}
                      </Link>
                    </p>
                  ) : null}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
