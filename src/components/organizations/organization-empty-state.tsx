"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export function OrganizationEmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-start gap-4 py-16">
      <h1 className="font-heading text-2xl font-bold">Ingen organisasjon</h1>
      <p className="text-app-base text-muted-foreground">
        Opprett en organisasjon for å bruke Venue Manager. Du blir satt som eier
        og får tilgang til dashboardet.
      </p>
      <Button render={<Link href="/app/onboarding" />}>Opprett organisasjon</Button>
    </div>
  );
}
