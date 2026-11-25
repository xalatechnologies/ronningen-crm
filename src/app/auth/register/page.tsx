"use client";

import { SignupCodeStep } from "@/app/auth/register/signup-code-step";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AgreementsField, type AgreementFieldName } from "@/features/legal/components/agreements-field";
import { APP_NAME } from "@/config/app";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  createRegisterSchema,
  type RegisterInput,
  validationMessagesForLocale,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Check, Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export default function RegisterPage() {
  const { t, locale } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"form" | "code">("form");
  const registerSchema = useMemo(
    () => createRegisterSchema(validationMessagesForLocale(locale)),
    [locale],
  );

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      acceptPrivacy: false,
      acceptDpa: false,
    },
  });

  const agreementValues = {
    acceptTerms: form.watch("acceptTerms"),
    acceptPrivacy: form.watch("acceptPrivacy"),
    acceptDpa: form.watch("acceptDpa"),
  };
  const passwordLongEnough = form.watch("password").length >= 8;
  const agreementFields: AgreementFieldName[] = ["acceptTerms", "acceptPrivacy", "acceptDpa"];
  const allAgreed = agreementFields.every((f) => agreementValues[f]);
  const passwordType = showPassword ? "text" : "password";
  const benefits = [
    t("auth.pages.registerBenefits.trial"),
    t("auth.pages.registerBenefits.oneplace"),
    t("auth.pages.registerBenefits.portal"),
  ];

  /** E-mails a code to the address. Resolves to an error message, or null when the code was sent. */
  async function sendCode(email: string): Promise<string | null> {
    const response = await fetch("/api/auth/register/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (response.ok) return null;
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    return payload?.error ?? t("auth.pages.signupCode.sendFailed");
  }

  /** Step 1: check the form, then prove the mailbox with an e-mailed code before any account exists. */
  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    const message = await sendCode(values.email);
    if (message) {
      setFormError(message);
      return;
    }
    setStep("code");
  }

  /** Step 2: the code is checked on the server together with the signup. Resolves to an error message, or null. */
  async function verifyAndRegister(code: string): Promise<string | null> {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form.getValues(), code }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      redirectTo?: string;
    } | null;

    if (!response.ok) return payload?.error ?? t("auth.pages.registerFailed");

    window.location.assign(payload?.redirectTo ?? "/app/onboarding");
    return null;
  }

  const fieldClass =
    "h-11 rounded-lg border border-input bg-background text-app-base shadow-xs focus-visible:border-success focus-visible:ring-success/25";
  const labelClass = "text-app-sm font-medium text-foreground";
  const errorClass = "text-app-sm text-destructive";

  const layoutProps = {
    heading: t("auth.pages.registerPanel.heading"),
    body: t("auth.pages.registerPanel.body"),
    points: benefits,
  };

  if (step === "code") {
    return (
      <AuthSplitLayout {...layoutProps}>
        <SignupCodeStep
          email={form.getValues("email")}
          onVerify={verifyAndRegister}
          onResend={() => sendCode(form.getValues("email"))}
          onChangeEmail={() => setStep("form")}
        />
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout {...layoutProps}>
      <div className="space-y-2">
        <h1 className="font-heading text-app-3xl font-bold tracking-tight text-foreground">
          {t("auth.createAccount")}
        </h1>
        <p className="text-app-base text-muted-foreground">
          {t("auth.pages.registerTagline", { appName: APP_NAME })}
        </p>
      </div>

      <form className="mt-8 flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className={labelClass}>
            {t("auth.fullName")}
          </Label>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder={t("auth.pages.namePlaceholder")}
            className={fieldClass}
            {...form.register("fullName")}
          />
          {form.formState.errors.fullName ? (
            <p className={errorClass}>{form.formState.errors.fullName.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className={labelClass}>
            {t("auth.email")}
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="deg@eksempel.no"
            className={fieldClass}
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className={errorClass}>{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className={labelClass}>
            {t("auth.password")}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={passwordType}
              autoComplete="new-password"
              aria-describedby="password-hint"
              className={cn(fieldClass, "pr-11")}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-success/40 focus-visible:outline-none"
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
          <p
            id="password-hint"
            className={cn("flex items-center gap-1.5 text-app-sm", passwordLongEnough ? "text-success" : "text-muted-foreground")}
          >
            <Check className={cn("size-4", passwordLongEnough ? "opacity-100" : "opacity-30")} aria-hidden />
            {t("auth.pages.passwordHint")}
          </p>
          {form.formState.errors.password ? (
            <p className={errorClass}>{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className={labelClass}>
            {t("auth.confirmPassword")}
          </Label>
          <Input
            id="confirmPassword"
            type={passwordType}
            autoComplete="new-password"
            className={fieldClass}
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword ? (
            <p className={errorClass}>{form.formState.errors.confirmPassword.message}</p>
          ) : null}
        </div>
        <AgreementsField
          values={agreementValues}
          errors={{
            acceptTerms: form.formState.errors.acceptTerms?.message,
            acceptPrivacy: form.formState.errors.acceptPrivacy?.message,
            acceptDpa: form.formState.errors.acceptDpa?.message,
          }}
          onToggle={(field, checked) => form.setValue(field, checked, { shouldValidate: form.formState.isSubmitted })}
          onToggleAll={(checked) => {
            for (const field of agreementFields) form.setValue(field, checked, { shouldValidate: form.formState.isSubmitted });
          }}
        />
        {formError ? (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-app-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="success"
          size="cta"
          disabled={form.formState.isSubmitting || !allAgreed}
          className="w-full"
        >
          {form.formState.isSubmitting ? t("auth.pages.signupCode.sending") : t("auth.createAccount")}
        </Button>
      </form>

      <p className="mt-8 text-center text-app-base text-muted-foreground">
        {t("auth.hasAccount")}{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-success underline decoration-success/40 underline-offset-4 transition-colors hover:text-success/90"
        >
          {t("auth.login")}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
