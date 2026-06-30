"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import {
  isBillingEnabled,
  SAAS_MONTHLY_PRICE_NOK,
  SAAS_TRIAL_DAYS,
} from "@/lib/billing/constants";
import { triggerWelcomeNotification } from "@/lib/notifications/actions/welcome";
import {
  createOrganizationForUser,
  toOrganizationError,
} from "@/lib/organizations/organization-queries";
import { useSupabase } from "@/providers/supabase-provider";

export function CreateOrganizationForm() {
  const supabase = useSupabase();
  const { user, loading: authLoading } = useAuthUser();
  const { refreshOrganizations } = useCurrentOrganization();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authLoading) return;
    if (!user) {
      toast.error("Du må være innlogget for å opprette en organisasjon.");
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Skriv inn et navn for organisasjonen.");
      return;
    }

    setSubmitting(true);
    try {
      const { organization: org, created } = await createOrganizationForUser(
        supabase,
        user.id,
        trimmed,
      );
      await refreshOrganizations();
      toast.success("Organisasjon opprettet.");

      if (created) {
        void triggerWelcomeNotification({ organizationName: org.name });
      }

      window.location.assign("/app/settings/organization");
    } catch (error) {
      toast.error(
        toOrganizationError(error, "Kunne ikke opprette organisasjon.").message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="organization-name">Organisasjonsnavn</Label>
        <Input
          id="organization-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="F.eks. Mitt selskap AS"
          autoComplete="organization"
          disabled={submitting}
        />
      </div>
      <Button type="submit" size="cta" disabled={submitting || authLoading}>
        {submitting ? "Oppretter…" : authLoading ? "Laster…" : "Opprett organisasjon"}
      </Button>
      {isBillingEnabled() ? (
        <p className="text-app-sm text-muted-foreground">
          Du får {SAAS_TRIAL_DAYS} dagers gratis prøveperiode uten betalingskort.
          Etter prøveperioden må du legge til betaling ({SAAS_MONTHLY_PRICE_NOK}{" "}
          kr/mnd) under Innstillinger → Fakturering for å fortsette.
        </p>
      ) : null}
    </form>
  );
}
