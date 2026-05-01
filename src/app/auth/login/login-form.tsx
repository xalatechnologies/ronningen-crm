"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/config/app";
import { getDevLoginDefaultValues } from "@/config/dev-login";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  createBrowserSupabaseClient,
  isSupabasePublicConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/app";
  const [formError, setFormError] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  const loginDefaults = getDevLoginDefaultValues();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaults,
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    if (!isSupabasePublicConfigured()) {
      setFormError(
        "Supabase URL og anon-nøkkel mangler. Kopier .env.example til .env.local, sett NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY fra prosjektet (Settings → API), og start npm run dev på nytt.",
      );
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      const message =
        error.message === "Failed to fetch" || error.name === "AuthRetryableFetchError"
          ? "Får ikke kontakt med Supabase. Sjekk NEXT_PUBLIC_SUPABASE_URL i .env.local, nettverk/VPN og at prosjektet ikke er pauset."
          : error.message;
      setFormError(message);
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="flex min-h-[min(100dvh,100svh)] flex-1 flex-col items-center justify-center px-4 py-16 md:px-8 md:py-24">
      <div className="flex w-full max-w-xl flex-col items-stretch gap-8">
        <Card
          className={cn(
            "w-full gap-0 py-0 text-base ring-0",
            RN_CARD_SHELL,
            "shadow-rn-card",
          )}
        >
          <CardHeader className="space-y-5 border-b-2 border-rn-border-strong/50 px-6 py-7 md:px-10 md:py-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-rn-accent-border bg-success font-heading text-lg font-bold text-primary-light shadow-sm md:size-16 md:text-xl"
                aria-hidden
              >
                R
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <CardTitle className="font-heading text-2xl font-bold tracking-tight text-rn-text-heading md:text-3xl lg:text-4xl">
                  Logg inn
                </CardTitle>
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {APP_NAME} — administrasjon av lokaler, bookinger og økonomi.
                </p>
              </div>
            </div>

            {loginDefaults.email ? (
              <div className="rounded-xl border-2 border-rn-border-strong/60 bg-muted/35 px-4 py-3 text-sm md:px-5 md:py-4 md:text-base">
                <p className="font-semibold text-rn-text-heading">
                  Lokal testbruker
                </p>
                <p className="mt-2 text-muted-foreground">
                  <span className="font-mono text-sm text-foreground md:text-base">
                    {loginDefaults.email}
                  </span>
                  <span className="mx-1.5 text-muted-foreground">/</span>
                  <span className="font-mono text-sm text-foreground md:text-base">
                    {loginDefaults.password}
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground md:text-sm">
                  Legg til brukeren i Supabase Auth hvis innlogging feiler.
                </p>
              </div>
            ) : null}

            {!isSupabasePublicConfigured() ? (
              <p className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 md:text-base dark:text-amber-100">
                <strong className="font-semibold">Supabase er ikke konfigurert.</strong>{" "}
                Opprett{" "}
                <code className="rounded-md bg-amber-500/20 px-1.5 py-0.5 font-mono text-xs md:text-sm">
                  .env.local
                </code>{" "}
                med{" "}
                <code className="rounded-md bg-amber-500/20 px-1.5 py-0.5 font-mono text-xs md:text-sm">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                og{" "}
                <code className="rounded-md bg-amber-500/20 px-1.5 py-0.5 font-mono text-xs md:text-sm">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>{" "}
                fra Supabase (Settings → API), og start dev-serveren på nytt.
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-8 pt-7 md:px-10 md:pb-10 md:pt-8">
            <form
              className="flex flex-col gap-6"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-[11px]"
                >
                  E-post
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="deg@eksempel.no"
                  className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-[11px]"
                >
                  Passord
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              {formError ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive md:text-base">
                  {formError}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "h-12 w-full rounded-xl border-2 border-rn-accent-border bg-success font-heading text-base font-bold text-white shadow-md hover:bg-rn-accent-fill-hover md:h-14 md:text-lg",
                )}
              >
                {form.formState.isSubmitting ? "Logger inn …" : "Logg inn"}
              </Button>
            </form>

            <div className="flex flex-col gap-4 border-t-2 border-rn-border-strong/50 pt-6 text-base sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
              <Link
                href="/auth/forgot-password"
                className="font-semibold text-success underline decoration-success/40 underline-offset-4 transition-colors hover:text-success/90"
              >
                Glemt passord?
              </Link>
              <Link
                href="/auth/register"
                className="font-semibold text-foreground underline decoration-rn-border-strong underline-offset-4 transition-colors hover:text-success"
              >
                Opprett konto
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
