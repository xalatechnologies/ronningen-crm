"use client";

import { AdminActionButton } from "@/components/admin/admin-action-button";
import { Label } from "@/components/ui/label";
import { updateOrganizationAdminNotes } from "@/lib/admin/actions/organizations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrganizationAdminNotesPanel({
  organizationId,
  initialNotes,
}: {
  organizationId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    const result = await updateOrganizationAdminNotes({
      organizationId,
      adminNotes: notes,
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => void handleSave(event)}
      className={cn(
        RN_CARD_SHELL,
        "flex flex-col gap-4 p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.25rem)]",
      )}
    >
      <div>
        <h2 className="app-section-title">Interne notater</h2>
        <p className="mt-2 app-text text-muted-foreground">
          Kun synlig for plattformadministratorer.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-notes">Notater</Label>
        <textarea
          id="admin-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={5}
          className="w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 py-3 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
          placeholder="Interne observasjoner, support-saker, avtaler…"
        />
      </div>

      {error ? (
        <p className="text-app-sm font-medium text-destructive">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-app-sm font-medium text-success">Lagret.</p>
      ) : null}

      <AdminActionButton type="submit" variant="default" disabled={busy}>
        {busy ? "Lagrer…" : "Lagre notater"}
      </AdminActionButton>
    </form>
  );
}
