"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";
import { LOGIN_CODE_TTL_MINUTES } from "@/lib/auth/login-code-config";
import { useState, type FormEvent } from "react";

const inputClass =
  "h-12 rounded-xl border-0 bg-[#f1f4f2] px-4 text-app-base shadow-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a4331]/60";

/** Sign in with a 6-digit code sent by e-mail (no password). */
export function CodeLogin({
  remember,
  onRememberChange,
  onSuccess,
  onBack,
  initialEmail = "",
}: {
  remember: boolean;
  onRememberChange: (value: boolean) => void;
  onSuccess: (redirectTo: string | undefined) => void;
  onBack: () => void;
  initialEmail?: string;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setError(t("auth.errors.invalidEmail"));
        return;
      }
      setCode("");
      setStep("code");
      setNotice(t("auth.otp.sentTo", { email, minutes: LOGIN_CODE_TTL_MINUTES }));
    } catch {
      setError(t("auth.errors.network"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, remember }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
      } | null;
      if (!response.ok) {
        setError(payload?.error ?? t("auth.otp.invalid"));
        setBusy(false);
        return;
      }
      onSuccess(payload?.redirectTo);
    } catch {
      setError(t("auth.errors.network"));
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => void (step === "email" ? sendCode(e) : verify(e))} noValidate>
      <div className="space-y-2">
        <Label htmlFor="code-email" className="text-app-sm font-semibold text-[#1a1c1a]">
          {t("auth.email")}
        </Label>
        <Input
          id="code-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={step === "code"}
          className={inputClass}
        />
      </div>

      {step === "code" ? (
        <div className="space-y-2">
          <Label htmlFor="login-code" className="text-app-sm font-semibold text-[#1a1c1a]">
            {t("auth.otp.codeLabel")}
          </Label>
          <Input
            id="login-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
          />
        </div>
      ) : null}

      <label className="flex cursor-pointer items-center gap-2.5 text-app-sm text-[#1a1c1a]">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onRememberChange(e.target.checked)}
          className="size-4 rounded accent-[#1a4331]"
        />
        {t("auth.rememberMe")}
      </label>

      {notice ? <p className="rounded-xl bg-[#e8f5ee] px-4 py-3 text-app-sm text-[#1a4331]">{notice}</p> : null}
      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-app-sm text-destructive md:text-app-base">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="success"
        size="cta"
        disabled={busy || (step === "code" && code.length !== 6) || !email.trim()}
        className="h-12 w-full rounded-xl shadow-none"
      >
        {step === "email"
          ? busy
            ? t("auth.otp.sending")
            : t("auth.otp.sendCode")
          : busy
            ? t("auth.pages.loggingIn")
            : t("auth.otp.verify")}
      </Button>

      <div className="flex flex-col items-center gap-2 text-app-sm font-semibold text-[#1a4331]">
        {step === "code" ? (
          <>
            <button type="button" onClick={() => void sendCode()} disabled={busy} className="hover:underline">
              {t("auth.otp.resend")}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setNotice(null);
                setError(null);
              }}
              className="hover:underline"
            >
              {t("auth.otp.changeEmail")}
            </button>
          </>
        ) : null}
        <button type="button" onClick={onBack} className="hover:underline">
          {t("auth.loginWithPassword")}
        </button>
      </div>
    </form>
  );
}
