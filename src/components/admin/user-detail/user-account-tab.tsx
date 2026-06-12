"use client";

import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { setPlatformAdmin } from "@/lib/admin/actions/users";
import type { AdminUserDetail } from "@/lib/admin/queries/users-billing-audit";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d. MMM yyyy HH:mm", { locale: nb });
}

export function UserAccountTab({
  user,
  isSelf,
}: {
  user: AdminUserDetail;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [platformAdminBusy, setPlatformAdminBusy] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);

  async function applyPlatformAdmin(next: boolean) {
    setPlatformAdminBusy(true);
    const result = await setPlatformAdmin({
      userId: user.id,
      isPlatformAdmin: next,
    });
    setPlatformAdminBusy(false);
    setConfirmRevokeOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      next ? "Plattformadmin-tilgang gitt" : "Plattformadmin-tilgang fjernet",
    );
    router.refresh();
  }

  function togglePlatformAdmin(next: boolean) {
    if (isSelf && !next) {
      setConfirmRevokeOpen(true);
      return;
    }
    void applyPlatformAdmin(next);
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <AdminDataPanel title="Profil">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="app-text-muted">Navn</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {user.fullName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">E-post</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {user.email ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">Bruker-ID</dt>
              <dd className="mt-1 font-mono text-app-sm">{user.id}</dd>
            </div>
            <div>
              <dt className="app-text-muted">Registrert</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {formatDateTime(user.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">Sist innlogget</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {formatDateTime(user.lastSignInAt)}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">Kontostatus</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {user.isDisabled ? "Deaktivert" : "Aktiv"}
              </dd>
            </div>
          </dl>
        </AdminDataPanel>

        <AdminDataPanel
          title="Plattformadmin"
          action={
            <AdminActionButton
              type="button"
              variant={user.isPlatformAdmin ? "destructive" : "default"}
              disabled={
                platformAdminBusy || (isSelf && user.isPlatformAdmin)
              }
              onClick={() => void togglePlatformAdmin(!user.isPlatformAdmin)}
            >
              {platformAdminBusy
                ? "Lagrer…"
                : user.isPlatformAdmin
                  ? "Fjern plattformadmin"
                  : "Gi plattformadmin"}
            </AdminActionButton>
          }
        >
          <p className="app-text text-muted-foreground">
            Gir tilgang til admin-konsollet (/admin). Endringer logges i
            revisjonsloggen.
          </p>
          {isSelf && user.isPlatformAdmin ? (
            <p className="mt-3 text-app-sm text-muted-foreground">
              Du kan ikke fjerne egen plattformadmin-tilgang uten bekreftelse.
            </p>
          ) : null}
        </AdminDataPanel>
      </div>

      <AdminConfirmActionDialog
        open={confirmRevokeOpen}
        onOpenChange={(open) => {
          if (!platformAdminBusy) setConfirmRevokeOpen(open);
        }}
        title="Fjerne egen plattformadmin-tilgang?"
        description="Du vil miste tilgang til admin-konsollet."
        confirmLabel="Ja, fjern"
        confirmVariant="destructive"
        busy={platformAdminBusy}
        onConfirm={() => void applyPlatformAdmin(false)}
      />
    </>
  );
}
