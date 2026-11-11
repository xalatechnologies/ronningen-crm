"use client";

import { AppBrandLogo } from "@/components/brand/app-brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/config/app";
import { getDevLoginDefaultValues } from "@/config/dev-login";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
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

  const demo = useMemo(() => getDictionary(locale).landing.heroDemo, [locale]);

  const inputClass =
    "h-12 rounded-xl border-0 bg-[#f1f4f2] px-4 text-app-base shadow-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a4331]/60";

  return (
    <main className="relative grid min-h-[min(100dvh,100svh)] flex-1 lg:grid-cols-[1.05fr_1fr]">
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

      <aside
        className="relative hidden flex-col justify-between gap-12 overflow-hidden bg-[#0c1f16] p-12 text-white lg:flex xl:p-16"
      >
        <Link
          href="/"
          className="flex w-fit items-center gap-3 font-heading text-lg font-bold transition-opacity hover:opacity-80"
        >
          <span className="relative size-10 overflow-hidden rounded-lg bg-black">
            <AppBrandLogo sizes="40px" />
          </span>
          {APP_NAME}
        </Link>

        <div className="flex flex-col gap-10">
          <p className="max-w-[18ch] text-[clamp(34px,3.4vw,56px)] leading-[1.05] font-bold tracking-[-0.03em]">
            {t("landing.hero.headline")}
          </p>

          <div aria-hidden className="max-w-[460px] rounded-2xl bg-white p-5 text-[#1a1c1a] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.6)]">
            <div className="grid grid-cols-3 gap-2.5">
              {demo.stats.map((stat, i) => (
                <div
                  key={stat.labelKey}
                  className={cn(
                    "rounded-xl px-3 py-2.5",
                    i === 0 ? "bg-[#1a4331] text-white" : "bg-[#f4f6f3]",
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-medium",
                      i === 0 ? "text-[#b9d3c4]" : "text-[#475569]",
                    )}
                  >
                    {t(
                      `landing.heroStats.${stat.labelKey}` as "landing.heroStats.revenue",
                    )}
                  </p>
                  <p className="mt-0.5 font-heading text-[15px] font-bold whitespace-nowrap">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-20 items-end gap-1.5">
              {[40, 65, 52, 78, 58, 88, 72, 48, 82, 60, 70, 55].map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-[4px]",
                    i === 5 ? "bg-[#1a4331]" : "bg-[#d3e6da]",
                  )}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="max-w-[40ch] text-sm leading-relaxed text-[#b9d3c4]">
          {t("auth.pages.loginTagline", { appName: APP_NAME })}
        </p>
      </aside>

      <div className="flex flex-col px-5 py-6 sm:px-10 md:py-10">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-8 py-10">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              aria-label={APP_NAME}
              className="relative size-12 overflow-hidden rounded-xl bg-black lg:hidden"
            >
              <AppBrandLogo sizes="48px" priority />
            </Link>
            <h1 className="text-[clamp(30px,4vw,40px)] leading-[1.1] font-bold tracking-[-0.03em] text-[#0c1f16]">
              {t("auth.login")}
            </h1>
            <p className="text-app-base leading-relaxed text-muted-foreground lg:hidden">
              {t("auth.pages.loginTagline", { appName: APP_NAME })}
            </p>
          </div>

          {!isSupabasePublicConfigured() ? (
            <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-app-sm text-amber-950 md:text-app-base dark:text-amber-100">
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

          {showDevLogin ? (
            <div
              className="rounded-xl bg-[#e8f5ee] px-4 py-3 text-app-sm md:text-app-base"
              aria-live="polite"
            >
              <p className="font-semibold text-[#1a4331]">
                {t("auth.platformAdminDev")}
              </p>
              <p className="mt-1 text-[#334155]">
                Feltene under er fylt ut med{" "}
                <span className="font-mono text-app-sm text-foreground md:text-app-base">
                  {loginDefaults.email}
                </span>
                .
              </p>
              <p className="mt-1.5 font-mono text-app-sm text-foreground">
                {t("auth.platformAdmin")}: {loginDefaults.email}
                <span className="mx-1.5 text-muted-foreground">/</span>
                {loginDefaults.password}
              </p>
            </div>
          ) : null}

          <form
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-app-sm font-semibold text-[#1a1c1a]"
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
                    className={inputClass}
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
              <div className="flex items-center justify-between gap-4">
                <Label
                  htmlFor="password"
                  className="text-app-sm font-semibold text-[#1a1c1a]"
                >
                  {t("auth.password")}
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-app-sm font-semibold text-[#1a4331] transition-colors hover:text-[#0c1f16] hover:underline"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <Controller
                name="password"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className={inputClass}
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
              <p className="rounded-xl bg-destructive/10 px-4 py-3 text-app-sm text-destructive md:text-app-base">
                {displayedError}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="success"
              size="cta"
              disabled={form.formState.isSubmitting}
              className="h-12 w-full rounded-xl shadow-none"
            >
              {form.formState.isSubmitting ? t("auth.pages.loggingIn") : t("auth.login")}
            </Button>
          </form>

          <Link
            href="/auth/register"
            className="self-center font-heading text-app-base font-semibold text-[#0c1f16] underline decoration-[#85b098] underline-offset-4 transition-colors hover:text-[#1a4331]"
          >
            {t("auth.createAccount")}
          </Link>
        </div>
      </div>
    </main>
  );
}
