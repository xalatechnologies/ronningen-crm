"use client";

import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/config/app";
import { getDevLoginDefaultValues } from "@/config/dev-login";
import { useTranslation } from "@/i18n/client";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { mapAuthErrorToUserMessage } from "@/lib/auth/auth-error-messages";
import {
  createBrowserSupabaseClient,
  isSupabasePublicConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  createLoginSchema,
  type LoginInput,
  validationMessagesForLocale,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { safeInternalRedirect } from "@/lib/security/safe-redirect";
import { shouldResolveAuthDestination } from "@/lib/organizations/tenant-setup";

export function LoginForm() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const redirect = useMemo(
    () => safeInternalRedirect(searchParams.get("redirect") ?? undefined),
    [searchParams],
  );
  const urlError = searchParams.get("error");
  const [formError, setFormError] = useState<string | null>(null);
  const displayedError = formError ?? urlError;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const loginDefaults = useMemo(() => getDevLoginDefaultValues(), []);
  const showDevLogin = Boolean(loginDefaults.email);
  const loginSchema = useMemo(
    () => createLoginSchema(validationMessagesForLocale(locale)),
    [locale],
  );

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaults,
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    if (!isSupabasePublicConfigured()) {
      setFormError(t("auth.pages.supabaseConfigMissing"));
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      const message =
        error.message === "Failed to fetch" || error.name === "AuthRetryableFetchError"
          ? t("auth.pages.supabaseConnectionError")
          : mapAuthErrorToUserMessage(error, locale);
      setFormError(message);
      return;
    }

    let destination = redirect;
    if (shouldResolveAuthDestination(redirect)) {
      const response = await fetch("/api/auth/destination");
      if (response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          redirectTo?: string;
        } | null;
        if (payload?.redirectTo) {
          destination = safeInternalRedirect(payload.redirectTo, redirect);
        }
      }
    }

    // Full navigation avoids a blank RSC transition while /app layouts load.
    window.location.assign(destination);
  }

  return (
    <main className="relative flex min-h-[min(100dvh,100svh)] flex-1 flex-col items-center justify-center px-4 py-16 md:px-8 md:py-24">
      {form.formState.isSubmitting ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="size-10 animate-spin rounded-full border-4 border-muted border-t-success" />
          <p className="text-app-base font-medium text-muted-foreground">
          {t("auth.pages.loggingIn")}
          </p>
        </div>
      ) : null}
      <div className="flex w-full max-w-xl flex-col items-stretch gap-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 self-start font-heading text-app-sm font-semibold text-rn-text-slate transition-colors hover:text-success md:text-app-base"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          {t("auth.pages.backToHome")}
        </Link>

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
                  {t("auth.login")}
                </CardTitle>
                <p className="text-app-sm leading-relaxed text-muted-foreground md:text-app-base">
                  {t("auth.pages.loginTagline", { appName: APP_NAME })}
                </p>
              </div>
            </div>

            {showDevLogin ? (
              <div className="rounded-md border-2 border-rn-border-strong/60 bg-muted/35 px-4 py-3 text-app-sm md:px-5 md:py-4 md:text-app-base">
                <p className="font-semibold text-rn-text-heading">
                  {t("auth.platformAdminDev")}
                </p>
                <p className="mt-2 text-muted-foreground">
                  Feltene under er fylt ut med{" "}
                  <span className="font-mono text-app-sm text-foreground md:text-app-base">
                    {loginDefaults.email}
                  </span>
                  .
                </p>
              </div>
            ) : null}

            {!isSupabasePublicConfigured() ? (
              <p className="rounded-md border-2 border-amber-500/40 bg-amber-500/10 px-4 py-3 text-app-sm text-amber-950 md:text-app-base dark:text-amber-100">
                <strong className="font-semibold">{t("auth.pages.supabaseNotConfigured")}</strong>{" "}
                {t("auth.pages.supabaseConfigBanner", {
                  envFile: ".env.local",
                  urlKey: "NEXT_PUBLIC_SUPABASE_URL",
                  anonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
                  publishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
                  restartDev: t("auth.pages.restartDevServer"),
                })}
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-8 pt-7 md:px-10 md:pb-10 md:pt-8">
            <form
              className="flex flex-col gap-6"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              {showDevLogin ? (
                <div
                  className="rounded-md border-2 border-success/30 bg-success/8 px-4 py-3 text-app-sm md:text-app-base"
                  aria-live="polite"
                >
                  <p className="font-semibold text-foreground">
                    {t("auth.platformAdmin")}
                  </p>
                  <p className="mt-1.5 font-mono text-app-sm text-foreground md:text-app-base">
                    {loginDefaults.email}
                    <span className="mx-1.5 text-muted-foreground">/</span>
                    {loginDefaults.password}
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-app-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-[11px]"
                >
                  {t("auth.email")}
                </Label>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder={loginDefaults.email || "deg@eksempel.no"}
                      className="h-12 rounded-md border-2 border-rn-border-strong text-app-base focus-visible:border-success focus-visible:ring-success/25"
                      {...field}
                      value={field.value ?? ""}
                    />
                  )}
                />
                {form.formState.errors.email ? (
                  <p className="text-app-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-app-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-[11px]"
                >
                  {t("auth.password")}
                </Label>
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      className="h-12 rounded-md border-2 border-rn-border-strong text-app-base focus-visible:border-success focus-visible:ring-success/25"
                      {...field}
                      value={field.value ?? ""}
                    />
                  )}
                />
                {form.formState.errors.password ? (
                  <p className="text-app-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              {displayedError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-app-sm text-destructive md:text-app-base">
                  {displayedError}
                </p>
              ) : null}
              <Button
                type="submit"
                variant="success"
                size="cta"
                disabled={form.formState.isSubmitting}
                className="w-full"
              >
                {form.formState.isSubmitting ? t("auth.pages.loggingIn") : t("auth.login")}
              </Button>
            </form>

            <div className="flex flex-col gap-4 border-t-2 border-rn-border-strong/50 pt-6 text-app-base sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
              <Link
                href="/auth/forgot-password"
                className="font-semibold text-success underline decoration-success/40 underline-offset-4 transition-colors hover:text-success/90"
              >
                {t("auth.forgotPassword")}
              </Link>
              <Link
                href="/auth/register"
                className="font-semibold text-foreground underline decoration-rn-border-strong underline-offset-4 transition-colors hover:text-success"
              >
                {t("auth.createAccount")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
