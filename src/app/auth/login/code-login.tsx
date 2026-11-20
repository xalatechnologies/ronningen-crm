"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";
import { PLATFORM_ADMIN_EMAIL } from "@/config/admin-routes";
import { LOGIN_CODE_TTL_MINUTES } from "@/lib/auth/login-code-config";
import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

const inputClass =
  "h-12 rounded-xl border-0 bg-[#f1f4f2] px-4 text-app-base shadow-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#3d62cf]/60";

/** Sign in with a 6-digit code sent by e-mail (no password). */
export function CodeLogin({
  remember,
  onRememberChange,
  onSuccess,
  onBack,
  initialEmail = "",
  savedEmails = [],
  onForgetEmail,
  onUsePassword,
}: {
  remember: boolean;
  onRememberChange: (value: boolean) => void;
  onSuccess: (redirectTo: string | undefined) => void;
  onBack: () => void;
  initialEmail?: string;
  /** Accounts remembered on this device: one tap sends the code, no e-mail to type. */
  savedEmails?: string[];
  onForgetEmail?: (email: string) => void;
  /** The platform admin signs in with the password only: no code is sent, the password form opens instead. */
  onUsePassword: (email: string) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(event?: FormEvent, to: string = email) {
    event?.preventDefault();
    if (to.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL) {
      onUsePassword(to.trim().toLowerCase());
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: to }),
      });
      if (!response.ok) {
        setError(t("auth.errors.invalidEmail"));
        return;
      }
      setCode("");
      setStep("code");
      setCooldown(30);
      setNotice(t("auth.otp.sentTo", { email: to, minutes: LOGIN_CODE_TTL_MINUTES }));
    } catch {
      setError(t("auth.errors.network"));
    } finally {
      setBusy(false);
    }
  }

  function pickSaved(saved: string) {
    setEmail(saved);
    void sendCode(undefined, saved);
  }

  async function verify(event: FormEvent | null, value: string = code) {
    event?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: value, remember }),
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
      {step === "email" && savedEmails.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {savedEmails.map((saved) => (
            <li key={saved} className="flex items-center gap-1 rounded-xl bg-[#eef2fd] pr-1 ring-1 ring-[#3d62cf]/15">
              <button
                type="button"
                disabled={busy}
                onClick={() => pickSaved(saved)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-left text-app-base font-medium text-[#13233a] transition-colors hover:bg-[#3d62cf]/8 disabled:opacity-60"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#3d62cf] text-app-sm font-semibold uppercase text-white">
                  {saved.charAt(0)}
                </span>
                <span className="truncate">{saved}</span>
              </button>
              {onForgetEmail ? (
                <button
                  type="button"
                  onClick={() => onForgetEmail(saved)}
                  aria-label={`× ${saved}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#55605a] hover:bg-[#3d62cf]/10"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {step === "email" ? (
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
            className={inputClass}
          />
        </div>
      ) : (
        <p className="truncate rounded-xl bg-[#eef2fd] px-4 py-3 text-app-base font-medium text-[#13233a]">{email}</p>
      )}

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
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(next);
              // The sixth digit (typed, pasted or autofilled) signs in at once.
              if (next.length === 6 && !busy) void verify(null, next);
            }}
            className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
          />
        </div>
      ) : null}

      <label className="flex cursor-pointer items-center gap-2.5 text-app-sm text-[#1a1c1a]">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onRememberChange(e.target.checked)}
          className="size-4 rounded accent-[#3d62cf]"
        />
        {t("auth.rememberMe")}
      </label>

      {notice ? <p className="rounded-xl bg-[#eef2fd] px-4 py-3 text-app-sm text-[#3d62cf]">{notice}</p> : null}
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

      <div className="flex flex-col items-center gap-2 text-app-sm font-semibold text-[#3d62cf]">
        {step === "code" ? (
          <>
            <button type="button" onClick={() => void sendCode()} disabled={busy || cooldown > 0} className="hover:underline disabled:opacity-60 disabled:no-underline">
              {cooldown > 0 ? t("auth.otp.resendIn", { seconds: cooldown }) : t("auth.otp.resend")}
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
