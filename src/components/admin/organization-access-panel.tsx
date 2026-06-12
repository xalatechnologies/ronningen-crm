"use client";

import { AdminAccessBadge } from "@/components/admin/admin-access-badge";
import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { Label } from "@/components/ui/label";
import {
  suspendOrganization,
  unsuspendOrganization,
} from "@/lib/admin/actions/organizations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OrganizationAccessPanelProps = {
  organizationId: string;
  isSuspended: boolean;
  subscriptionStatus: string;
  suspendedReason: string | null;
  providerSubscriptionId?: string | null;
  billingEnabled?: boolean;
};

export function OrganizationAccessPanel({
  organizationId,
  isSuspended,
  subscriptionStatus,
  suspendedReason,
  providerSubscriptionId = null,
  billingEnabled = false,
}: OrganizationAccessPanelProps) {
  const router = useRouter();
  const [reason, setReason] = useState(suspendedReason ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);

  async function handleUnsuspend() {
    setBusy(true);
    setError(null);
    const result = await unsuspendOrganization(organizationId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleSuspend() {
    setBusy(true);
    setError(null);
    const result = await suspendOrganization({
      organizationId,
      reason: reason.trim() || null,
    });
    setBusy(false);
    setConfirmSuspendOpen(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <section
        className={cn(
          RN_CARD_SHELL,
          "flex flex-col gap-4 p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.25rem)]",
        )}
      >
        <div>
          <h2 className="app-section-title">Tilgang</h2>
          <p className="mt-2 app-text text-muted-foreground">
            Suspendert tilgang overstyrer abonnementsstatus og blokkerer appen.
          </p>
          <div className="mt-3">
            <AdminAccessBadge
              isSuspended={isSuspended}
              subscriptionStatus={subscriptionStatus}
              providerSubscriptionId={providerSubscriptionId}
              billingEnabled={billingEnabled}
            />
          </div>
        </div>

        {!isSuspended ? (
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Grunn (valgfritt, vises til tenant)</Label>
            <textarea
              id="suspend-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 py-3 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
              placeholder="F.eks. brudd på vilkår, ubetalt faktura…"
            />
            <AdminActionButton
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => setConfirmSuspendOpen(true)}
            >
              Suspendér organisasjon
            </AdminActionButton>
          </div>
        ) : (
          <div className="space-y-3">
            {suspendedReason ? (
              <p className="app-text text-muted-foreground">
                Grunn: {suspendedReason}
              </p>
            ) : null}
            <AdminActionButton
              type="button"
              variant="default"
              disabled={busy}
              onClick={() => void handleUnsuspend()}
            >
              {busy ? "Opphever…" : "Opphev suspensjon"}
            </AdminActionButton>
          </div>
        )}

        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : null}
      </section>

      <AdminConfirmActionDialog
        open={confirmSuspendOpen}
        onOpenChange={setConfirmSuspendOpen}
        title="Suspendér organisasjon?"
        description="Alle brukere i organisasjonen mister tilgang til appen inntil suspensjon oppheves."
        confirmLabel="Ja, suspendér"
        confirmVariant="destructive"
        busy={busy}
        onConfirm={handleSuspend}
      />
    </>
  );
}
