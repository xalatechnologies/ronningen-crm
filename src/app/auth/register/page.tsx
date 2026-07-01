"use client";

import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/config/app";
import { useTranslation } from "@/i18n/client";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import {
  createRegisterSchema,
  type RegisterInput,
  validationMessagesForLocale,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export default function RegisterPage() {
  const { t, locale } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
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
    },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      redirectTo?: string;
    } | null;

    if (!response.ok) {
      setFormError(payload?.error ?? t("auth.pages.registerFailed"));
      return;
    }

    window.location.assign(payload?.redirectTo ?? "/app/onboarding");
  }

  const fieldClass =
    "h-12 rounded-md border-2 border-rn-border-strong text-app-base focus-visible:border-success focus-visible:ring-success/25";
  const labelClass =
    "text-app-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-[11px]";

  return (
    <main className="flex min-h-[min(100dvh,100svh)] flex-1 flex-col items-center justify-center px-4 py-16 md:px-8 md:py-24">
      <div className="flex w-full max-w-xl flex-col items-stretch gap-8">
        <Card
          className={cn(
            "w-full gap-0 py-0 text-app-base ring-0",
            RN_CARD_SHELL,
            "shadow-rn-card",
          )}
        >
          <CardHeader className="space-y-5 border-b-2 border-rn-border-strong/50 px-6 py-7 md:px-10 md:py-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <AuthBrandMark />
              <div className="min-w-0 flex-1 space-y-2">
                <CardTitle className="app-title md:text-app-3xl">
                  {t("auth.createAccount")}
                </CardTitle>
                <p className="text-app-sm leading-relaxed text-muted-foreground md:text-app-base">
                  {t("auth.pages.registerTagline", { appName: APP_NAME })}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-8 pt-7 md:px-10 md:pb-10 md:pt-8">
            <form
              className="flex flex-col gap-6"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              <div className="space-y-2">
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
                  <p className="text-app-sm text-destructive">
                    {form.formState.errors.fullName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
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
                  <p className="text-app-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className={labelClass}>
                  {t("auth.password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className={fieldClass}
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p className="text-app-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className={labelClass}>
                  {t("auth.confirmPassword")}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className={fieldClass}
                  {...form.register("confirmPassword")}
                />
                {form.formState.errors.confirmPassword ? (
                  <p className="text-app-sm text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>
              {formError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-app-sm text-destructive md:text-app-base">
                  {formError}
                </p>
              ) : null}
                <Button
                  type="submit"
                  variant="success"
                  size="cta"
                  disabled={form.formState.isSubmitting}
                  className="w-full"
                >
                {form.formState.isSubmitting ? t("common.actions.loading") : t("auth.createAccount")}
              </Button>
            </form>

            <div className="border-t-2 border-rn-border-strong/50 pt-6">
              <p className="text-app-base text-muted-foreground">
                {t("auth.hasAccount")}{" "}
                <Link
                  href="/auth/login"
                  className="font-semibold text-success underline decoration-success/40 underline-offset-4 transition-colors hover:text-success/90"
                >
                  Logg inn
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
