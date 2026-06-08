import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-8">
      <Card className={cn(RN_CARD_SHELL)}>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            Opprett organisasjon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-app-base text-muted-foreground">
            Gi organisasjonen et navn for å starte. Du blir satt som eier og
            får tilgang til dashboardet.
          </p>
          <CreateOrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}
