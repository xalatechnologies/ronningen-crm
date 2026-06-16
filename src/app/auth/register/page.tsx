"use client";

import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/config/app";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function RegisterPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

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
    setInfo(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: origin ? `${origin}/auth/login` : undefined,
        data: { full_name: values.fullName },
      },
    });
    if (error) {
      setFormError(error.message);
      return;
    }
    setInfo(
      "Sjekk innboksen din for å bekrefte kontoen. Deretter kan du logge inn.",
    );
    router.refresh();
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
                  Opprett konto
                </CardTitle>
                <p className="text-app-sm leading-relaxed text-muted-foreground md:text-app-base">
                  Registrer deg for å bruke {APP_NAME}.
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
                  Navn
                </Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  placeholder="For- og etternavn"
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
                  E-post
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
                  Passord
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
                  Bekreft passord
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
              {info ? (
                <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-app-sm text-foreground md:text-app-base">
                  {info}
                </p>
              ) : null}
                <Button
                  type="submit"
                  variant="success"
                  size="cta"
                  disabled={form.formState.isSubmitting}
                  className="w-full"
                >
                {form.formState.isSubmitting ? "Oppretter …" : "Opprett konto"}
              </Button>
            </form>

            <div className="border-t-2 border-rn-border-strong/50 pt-6">
              <p className="text-app-base text-muted-foreground">
                Har du allerede en konto?{" "}
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
