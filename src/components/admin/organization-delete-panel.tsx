"use client";

import { useTranslation } from "@/i18n/client";
import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteOrganization } from "@/lib/admin/actions/organizations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrganizationDeletePanel({
  organizationId,
  organizationName,
  organizationSlug,
}: {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [confirmSlug, setConfirmSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    setBusy(true);
    setError(null);

    const result = await deleteOrganization({
      organizationId,
      confirmSlug,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.push("/admin/organizations");
    router.refresh();
  }

  return (
    <>
      <section
        className={cn(
          RN_CARD_SHELL,
          "border-destructive/30 p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.25rem)]",
        )}
      >
        <h2 className="app-section-title text-destructive">{t("adminLabels.sections.dangerousZone")}</h2>
        <p className="mt-2 app-text text-muted-foreground">
          {t("adminLabels.deleteOrgDescription", { name: organizationName })}
        </p>
        <AdminActionButton
          type="button"
          variant="destructive"
          className="mt-4"
          onClick={() => setOpen(true)}
        >
          {t("adminLabels.deleteOrganization")}
        </AdminActionButton>
        {error && !open ? (
          <p className="mt-3 text-app-sm font-medium text-destructive">{error}</p>
        ) : null}
      </section>

      <AdminConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={t("adminLabels.deleteOrgTitle", { name: organizationName })}
        description={
          <div className="space-y-3">
            <p>{t("adminLabels.deleteOrgConfirmHint")}</p>
            <code className="block rounded-md bg-muted px-2 py-1 text-app-sm">
              {organizationSlug}
            </code>
            <div className="space-y-2">
              <Label htmlFor="confirm-slug">{t("adminLabels.fields.slug")}</Label>
              <Input
                id="confirm-slug"
                value={confirmSlug}
                onChange={(event) => setConfirmSlug(event.target.value)}
                placeholder={organizationSlug}
              />
            </div>
            {error ? (
              <p className="text-app-sm font-medium text-destructive">{error}</p>
            ) : null}
          </div>
        }
        confirmLabel={t("admin.ja_slett_permanent")}
        confirmVariant="destructive"
        busy={busy}
        onConfirm={handleDelete}
      />
    </>
  );
}
