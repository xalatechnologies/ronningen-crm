"use client";

import { useTranslation } from "@/i18n/client";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function OrganizationEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-start gap-4 py-16">
      <h1 className="font-heading text-2xl font-bold">{t("admin.ingen_organisasjon")}</h1>
      <p className="text-app-base text-muted-foreground">
        Opprett en organisasjon for å bruke Event Manager. Du blir satt som eier
        og får tilgang til dashboardet.
      </p>
      <Button nativeButton={false} render={<Link href="/app/onboarding" />}>
        Opprett organisasjon
      </Button>
    </div>
  );
}
