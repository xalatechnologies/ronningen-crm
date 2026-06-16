"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/config/app";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { loginSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const forgotSchema = loginSchema.pick({ email: true });
type ForgotInput = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  const form = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotInput) {
    setFormError(null);
    setInfo(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: origin ? `${origin}/auth/login` : undefined,
    });
    if (error) {
      setFormError(error.message);
      return;
    }
    setInfo(
      "Hvis det finnes en konto for denne adressen, har vi sendt en lenke for å nullstille passordet.",
    );
  }

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
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-md border-2 border-rn-accent-border bg-success font-heading text-app-lg font-bold text-primary-light shadow-sm md:size-16 md:text-app-xl"
                aria-hidden
              >
                R
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <CardTitle className="app-title md:text-app-3xl">
                  Glemt passord?
                </CardTitle>
                <p className="text-app-sm leading-relaxed text-muted-foreground md:text-app-base">
                  {APP_NAME} — skriv inn e-posten din. Du får en lenke til å velge nytt
                  passord hvis kontoen finnes.
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
                <Label
                  htmlFor="email"
                  className="text-app-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-[11px]"
                >
                  E-post
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="deg@eksempel.no"
                  className="h-12 rounded-md border-2 border-rn-border-strong text-app-base focus-visible:border-success focus-visible:ring-success/25"
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p className="text-app-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              {formError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-app-sm text-destructive md:text-app-base">
                  {formError}
                </p>
              ) : null}
              {info ? (
                <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-app-sm text-success md:text-app-base">
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
                {form.formState.isSubmitting
                  ? "Sender …"
                  : "Send tilbakestillingslenke"}
              </Button>
            </form>

            <div className="border-t-2 border-rn-border-strong/50 pt-6">
              <Link
                href="/auth/login"
                className="text-app-base font-semibold text-success underline decoration-success/40 underline-offset-4 transition-colors hover:text-success/90"
              >
                Tilbake til innlogging
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
