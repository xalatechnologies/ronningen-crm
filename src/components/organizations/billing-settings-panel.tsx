"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøveperiode",
  past_due: "Forfalt",
  canceled: "Avsluttet",
  incomplete: "Ufullstendig",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function BillingSettingsPanel() {
  const { currentOrganization, loading } = useCurrentOrganization();

  if (loading) {
    return <p className="text-muted-foreground">Laster abonnement…</p>;
  }

  if (!currentOrganization) {
    return (
      <p className="text-muted-foreground">
        Ingen aktiv organisasjon. Opprett en organisasjon først.
      </p>
    );
  }

  const statusLabel =
    STATUS_LABELS[currentOrganization.subscriptionStatus] ??
    currentOrganization.subscriptionStatus;
  const planLabel =
    PLAN_LABELS[currentOrganization.subscriptionPlan] ??
    currentOrganization.subscriptionPlan;

  return (
    <Card className={cn(RN_CARD_SHELL)}>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Abonnement</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-app-base">
        <div>
          <p className="text-app-sm text-muted-foreground">Organisasjon</p>
          <p className="font-medium">{currentOrganization.name}</p>
        </div>
        <div>
          <p className="text-app-sm text-muted-foreground">Plan</p>
          <p className="font-medium">{planLabel}</p>
        </div>
        <div>
          <p className="text-app-sm text-muted-foreground">Status</p>
          <p className="font-medium">{statusLabel}</p>
        </div>
        <p className="text-app-sm text-muted-foreground">
          Betalingsintegrasjon (Stripe) er ikke aktivert ennå. Kontakt
          support for å endre plan eller fakturering.
        </p>
      </CardContent>
    </Card>
  );
}
