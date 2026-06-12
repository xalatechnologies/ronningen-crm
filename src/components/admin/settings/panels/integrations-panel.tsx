import { IntegrationCard } from "@/components/admin/settings/integration-card";
import type { AdminSettingsOverview } from "@/lib/admin/queries/settings";

export function IntegrationsPanel({
  settings,
}: {
  settings: AdminSettingsOverview;
}) {
  const needsAttention = settings.integrations.filter(
    (item) => item.status === "warning" || item.status === "critical",
  );
  const sorted = [
    ...needsAttention,
    ...settings.integrations.filter(
      (item) => item.status !== "warning" && item.status !== "critical",
    ),
  ];

  return (
    <div className="grid gap-[length:var(--spacing-app-gap)] md:grid-cols-2">
      {sorted.map((integration) => (
        <IntegrationCard key={integration.id} integration={integration} />
      ))}
    </div>
  );
}
