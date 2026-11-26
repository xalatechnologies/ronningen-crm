"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGIN_CODE_TTL_MINUTES } from "@/lib/auth/login-code-config";
import { useTranslation } from "@/i18n/client";

const RESEND_COOLDOWN_SECONDS = 30;

type Props = {
  email: string;
  /** Resolves to an error message, or null when the account was created. */
  onVerify: (code: string) => Promise<string | null>;
  /** Resolves to an error message, or null when a new code was sent. */
  onResend: () => Promise<string | null>;
  onChangeEmail: () => void;
};

/** Step 2 of signup: the user types the 6-digit code that was e-mailed to prove the mailbox is theirs. */
export function SignupCodeStep({ email, onVerify, onResend, onChangeEmail }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const message = await onVerify(code);
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError(null);
    const message = await onResend();
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setCode("");
    setNotice(t("auth.pages.signupCode.resent"));
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-app-3xl font-bold tracking-tight text-foreground">
          {t("auth.pages.signupCode.title")}
        </h1>
        <p className="text-app-base text-muted-foreground">
          {t("auth.pages.signupCode.intro", { email, minutes: LOGIN_CODE_TTL_MINUTES })}
        </p>
        <p className="text-app-sm text-muted-foreground">{t("auth.pages.signupCode.spamHint")}</p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={verify} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="signup-code" className="text-app-sm font-medium text-foreground">
            {t("auth.pages.signupCode.label")}
          </Label>
          <Input
            id="signup-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            aria-invalid={error ? true : undefined}
            className="h-14 rounded-lg border border-input bg-background text-center font-mono text-2xl tracking-[0.5em] shadow-xs focus-visible:border-success focus-visible:ring-success/25"
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-app-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-app-sm text-success">
            {notice}
          </p>
        ) : null}

        <Button type="submit" variant="success" size="cta" disabled={busy || code.length !== 6} className="w-full">
          {busy ? t("common.actions.loading") : t("auth.pages.signupCode.submit")}
        </Button>
      </form>

      <div className="flex items-center justify-between gap-4 text-app-sm">
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0 || busy}
          className="font-semibold text-success underline decoration-success/40 underline-offset-4 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? t("auth.otp.resendIn", { seconds: cooldown }) : t("auth.pages.signupCode.resend")}
        </button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("auth.pages.signupCode.changeEmail")}
        </button>
      </div>
    </div>
  );
}
