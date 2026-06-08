import { BillingSettingsPanel } from "@/components/organizations/billing-settings-panel";

export default function BillingSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Fakturering</h1>
        <p className="mt-2 text-app-base text-muted-foreground">
          Se abonnementsstatus for den aktive organisasjonen.
        </p>
      </div>
      <BillingSettingsPanel />
    </div>
  );
}
