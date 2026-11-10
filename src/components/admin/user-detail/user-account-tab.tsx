"use client";

import { useTranslation } from "@/i18n/client";
import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { setPlatformAdmin } from "@/lib/admin/actions/users";
import type { AdminUserDetail } from "@/lib/admin/queries/users-billing-audit";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function formatDateTime(iso: string | null, locale: import("@/i18n/config").Locale): string {
  if (!iso) return "—";
  return format(new Date(iso), "d. MMM yyyy HH:mm", { locale: getDateFnsLocale(locale) });
}

export function UserAccountTab({
  user,
  isSelf,
}: {
  user: AdminUserDetail;
  isSelf: boolean;
}) {
  const { t, locale } = useTranslation();
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
      next ? t("admin.plattformadmin_tilgang_gitt") : t("admin.plattformadmin_tilgang_fjernet"),
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
        <AdminDataPanel title={t("admin.profil")}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="app-text-muted">{t("adminLabels.fields.name")}</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {user.fullName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">{t("admin.e_post")}</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {user.email ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">{t("adminLabels.fields.userId")}</dt>
              <dd className="mt-1 font-mono text-app-sm">{user.id}</dd>
            </div>
            <div>
              <dt className="app-text-muted">{t("adminLabels.fields.registered")}</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {formatDateTime(user.createdAt, locale)}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">{t("adminLabels.fields.lastLogin")}</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {formatDateTime(user.lastSignInAt, locale)}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">{t("admin.kontostatus")}</dt>
              <dd className="mt-1 font-heading text-app-md font-semibold">
                {user.isDisabled ? t("admin.deaktivert") : t("admin.aktiv")}
              </dd>
            </div>
          </dl>
        </AdminDataPanel>

        <AdminDataPanel
          title={t("admin.plattformadmin")}
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
                ? t("admin.lagrer")
                : user.isPlatformAdmin
                  ? t("admin.fjern_plattformadmin")
                  : t("admin.gi_plattformadmin")}
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
        title={t("admin.fjerne_egen_plattformadmin_tilgang")}
        description={t("admin.du_vil_miste_tilgang_til_admin_konsollet")}
        confirmLabel={t("admin.ja_fjern")}
        confirmVariant="destructive"
        busy={platformAdminBusy}
        onConfirm={() => void applyPlatformAdmin(false)}
      />
    </>
  );
}
