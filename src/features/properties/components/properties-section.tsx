"use client";

import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { propertyTypeLabel, type PropertyListRow } from "@/components/properties/types";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { createProperty, deleteProperty, updateProperty } from "@/features/properties/data/properties";
import { PropertyFormDialog } from "@/features/properties/components/property-form-dialog";
import { PropertyList } from "@/features/properties/components/property-list";
import { propertyFormToPayload, propertyMatchesQuery } from "@/features/properties/lib/property-form";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTranslation } from "@/i18n/client";
import { completeTenantSetup } from "@/lib/organizations/actions/complete-tenant-setup";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import type { PropertyFormInput } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { usePageSearch } from "@/providers/page-search-provider";
import { useSupabase } from "@/providers/supabase-provider";

export type PropertiesSectionProps = {
  properties: PropertyListRow[];
  canManage: boolean;
  loadError: string | null;
  setupMode?: boolean;
};

export function PropertiesSection({ properties, canManage, loadError, setupMode = false }: PropertiesSectionProps) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const router = useRouter();
  const { query } = usePageSearch();
  const [dialog, setDialog] = useState<{ open: boolean; row: PropertyListRow | null }>({ open: false, row: null });
  const [deleteTarget, setDeleteTarget] = useState<PropertyListRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(
    () => properties.filter((p) => propertyMatchesQuery(p, propertyTypeLabel(p.type, t), query)),
    [properties, query, t],
  );

  function openCreate() {
    setDialog({ open: true, row: null });
  }

  function closeDialog() {
    setDialog((current) => ({ ...current, open: false }));
  }

  function organizationIdOrToast(): string | null {
    try {
      return requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.toasts.noActiveOrg"));
      return null;
    }
  }

  async function onSubmit(data: PropertyFormInput) {
    const organizationId = organizationIdOrToast();
    if (!organizationId) return;
    const payload = propertyFormToPayload(data);
    const editing = dialog.row;
    const wasFirstProperty = !editing && properties.length === 0;

    const result = editing
      ? await updateProperty(supabase, organizationId, editing.id, payload)
      : await createProperty(supabase, organizationId, payload);

    if (!result.ok) {
      toast.error(editing ? t("common.toasts.saveFailed") : t("properties.createFailed"), {
        description: result.message,
      });
      return;
    }
    toast.success(editing ? t("properties.venueUpdated") : t("properties.venueCreated"));
    closeDialog();
    router.refresh();

    if (setupMode && wasFirstProperty) {
      const completed = await completeTenantSetup();
      if (!completed.ok) {
        toast.error(completed.error);
        return;
      }
      toast.success(t("properties.setupComplete"));
      window.location.assign("/app/dashboard");
    }
  }

  async function confirmDelete() {
    const organizationId = organizationIdOrToast();
    if (!deleteTarget || !organizationId) return;
    setDeleteBusy(true);
    try {
      const result = await deleteProperty(supabase, organizationId, deleteTarget.id);
      if (!result.ok) {
        toast.error(t("common.toasts.deleteFailed"), {
          description: result.inUse ? t("properties.deleteInUse") : result.message,
        });
        return;
      }
      toast.success(t("properties.venueDeleted"));
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("properties.title")}
        description={setupMode ? t("properties.setupDescription") : t("properties.defaultDescription")}
        actions={
          canManage ? (
            <Button type="button" data-tour="add-building" onClick={openCreate} className={cn(buttonVariants({ variant: "success", size: "cta" }))}>
              <Plus className="size-5" aria-hidden />
              {t("properties.newVenue")}
            </Button>
          ) : null
        }
      />

      {loadError ? (
        <div className={cn(RN_CARD_SHELL, "px-5 py-4 md:px-6")} role="alert">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t("properties.loadError", { error: loadError })}
          </div>
        </div>
      ) : null}

      {!loadError && properties.length === 0 ? (
        <div className={cn(RN_CARD_SHELL, "flex flex-col items-center gap-4 px-6 py-16 text-center md:px-8")}>
          <div className="flex size-14 items-center justify-center rounded-xl bg-muted/60 ring-1 ring-foreground/10">
            <Building2 className="size-7 text-muted-foreground" aria-hidden />
          </div>
          <div>
            <p className="font-medium text-foreground">{t("properties.emptyTitle")}</p>
            <p className="mt-2 max-w-md text-app-sm text-muted-foreground">
              {canManage ? t("properties.emptyCanManage") : t("properties.emptyReadOnly")}
            </p>
          </div>
          {canManage ? (
            <Button type="button" variant="success" size="cta" onClick={openCreate}>
              <Plus className="size-5" aria-hidden />
              {t("properties.newVenue")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!loadError && properties.length > 0 ? (
        <>
          {filtered.length === 0 ? (
            <p className={cn(RN_CARD_SHELL, "px-6 py-10 text-center text-muted-foreground md:px-8")}>
              {t("properties.noSearchResults")}
            </p>
          ) : (
            <PropertyList
              properties={filtered}
              canManage={canManage}
              onEdit={(row) => setDialog({ open: true, row })}
              onDelete={setDeleteTarget}
            />
          )}
          <p className="text-app-sm text-muted-foreground">
            {t("properties.showingCount", { filtered: filtered.length, total: properties.length })}
          </p>
        </>
      ) : null}

      <PropertyFormDialog open={dialog.open} row={dialog.row} onClose={closeDialog} onSubmit={onSubmit} />

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("properties.deleteTitle")}
        description={deleteTarget ? t("properties.deleteDescription", { name: deleteTarget.name }) : null}
        confirmLabel={t("properties.confirmDelete")}
        busy={deleteBusy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
