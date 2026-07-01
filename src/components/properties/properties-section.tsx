"use client";

import type { PropertyListRow } from "@/components/properties/types";
import { propertyTypeLabel } from "@/components/properties/types";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddressField } from "@/components/forms/address-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField, toStringOptions } from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { Translator } from "@/i18n/types";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { completeTenantSetup } from "@/lib/organizations/actions/complete-tenant-setup";
import {
  PROPERTY_TYPES,
  propertyFormSchema,
  type PropertyFormInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

const labelClass =
  "text-app-xs font-semibold uppercase tracking-wider text-muted-foreground";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-sm shadow-sm outline-none md:h-12 md:px-4 md:text-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

const emptyDefaults: PropertyFormInput = {
  name: "",
  address: "",
  type: "",
  notes: "",
};

function PropertyFields({
  form,
  idPrefix,
  t,
}: {
  form: UseFormReturn<PropertyFormInput>;
  idPrefix: string;
  t: Translator;
}) {
  const { register, setValue, formState } = form;
  const err = formState.errors;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`} className={labelClass}>
          {t("common.fields.name")}
        </Label>
        <Input
          id={`${idPrefix}-name`}
          {...register("name")}
          className={fieldClass}
          placeholder={t("properties.namePlaceholder")}
        />
        {err.name ? (
          <p className="text-xs text-destructive">{err.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-type`} className={labelClass}>
          {t("common.fields.type")}
        </Label>
        <FormSelectField
          name="type"
          control={form.control}
          id={`${idPrefix}-type`}
          className={fieldClass}
          placeholder={t("properties.typePlaceholder")}
          options={toStringOptions(PROPERTY_TYPES, (type) =>
            propertyTypeLabel(type, t),
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-address`} className={labelClass}>
          {t("common.fields.address")}
        </Label>
        <AddressField
          id={`${idPrefix}-address`}
          name="address"
          register={register}
          setValue={setValue}
          className={fieldClass}
          placeholder={t("properties.addressPlaceholder")}
        />
        {err.address ? (
          <p className="text-xs text-destructive">{err.address.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`} className={labelClass}>
          {t("common.fields.notes")}
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          {...register("notes")}
          rows={4}
          className={cn(fieldClass, "min-h-24 py-3")}
          placeholder={t("properties.notesPlaceholder")}
        />
        {err.notes ? (
          <p className="text-xs text-destructive">{err.notes.message}</p>
        ) : null}
      </div>
    </div>
  );
}

function rowToForm(row: PropertyListRow): PropertyFormInput {
  const type = row.type ?? "";
  const normalizedType = (PROPERTY_TYPES as readonly string[]).includes(type)
    ? (type as PropertyFormInput["type"])
    : "";
  return {
    name: row.name,
    address: row.address ?? "",
    type: normalizedType,
    notes: row.notes ?? "",
  };
}

function payloadFromForm(data: PropertyFormInput) {
  return {
    name: data.name,
    address: data.address.trim() || null,
    type: data.type || null,
    notes: data.notes?.trim() || null,
  };
}

function PropertyCard({
  property,
  canManage,
  onEdit,
  onDelete,
  t,
}: {
  property: PropertyListRow;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  t: Translator;
}) {
  const address = property.address?.trim();
  const notes = property.notes?.trim();
  const typeLabel = propertyTypeLabel(property.type, t);

  return (
    <article className={cn(RN_CARD_SHELL, "flex flex-col p-5 md:p-6")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rn-border-strong/70 bg-muted/30 text-muted-foreground">
            <Building2 className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {property.name}
            </h3>
            {typeLabel !== "—" ? (
              <span className="mt-2 inline-flex rounded-md border-2 border-rn-border-strong bg-muted/25 px-2 py-0.5 text-app-xs font-semibold text-muted-foreground">
                {typeLabel}
              </span>
            ) : null}
          </div>
        </div>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-10 text-muted-foreground hover:text-foreground"
              aria-label={t("properties.editAria", { name: property.name })}
              onClick={onEdit}
            >
              <Pencil className="size-5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-10 text-muted-foreground hover:text-destructive"
              aria-label={t("properties.deleteAria", { name: property.name })}
              onClick={onDelete}
            >
              <Trash2 className="size-5" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>

      <dl className="mt-5 flex flex-col gap-3 border-t border-rn-border-strong/50 pt-5">
        <div>
          <dt className={labelClass}>{t("common.fields.address")}</dt>
          <dd className="mt-1 flex items-start gap-2 text-app-sm text-foreground">
            <MapPin
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span>{address || t("properties.notSpecified")}</span>
          </dd>
        </div>
        {notes ? (
          <div>
            <dt className={labelClass}>{t("common.fields.notes")}</dt>
            <dd className="mt-1 line-clamp-3 text-app-sm leading-relaxed text-muted-foreground">
              {notes}
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

export type PropertiesSectionProps = {
  properties: PropertyListRow[];
  canManage: boolean;
  loadError: string | null;
  setupMode?: boolean;
};

export function PropertiesSection({
  properties,
  canManage,
  loadError,
  setupMode = false,
}: PropertiesSectionProps) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{
    open: boolean;
    row: PropertyListRow | null;
  }>({ open: false, row: null });
  const [deleteTarget, setDeleteTarget] = useState<PropertyListRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const form = useForm<PropertyFormInput>({
    resolver: zodResolver(propertyFormSchema) as Resolver<PropertyFormInput>,
    defaultValues: emptyDefaults,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => {
      const hay = [
        p.name,
        p.address ?? "",
        propertyTypeLabel(p.type, t),
        p.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [properties, query, t]);

  function openCreate() {
    form.reset(emptyDefaults);
    setDialog({ open: true, row: null });
  }

  function openEdit(row: PropertyListRow) {
    form.reset(rowToForm(row));
    setDialog({ open: true, row });
  }

  function closeDialog() {
    setDialog({ open: false, row: null });
    form.reset(emptyDefaults);
  }

  async function onSubmit(data: PropertyFormInput) {
    const payload = payloadFromForm(data);

    const wasFirstProperty = !dialog.row && properties.length === 0;

    if (dialog.row) {
      let orgId: string;
      try {
        orgId = requireOrganizationId(currentOrganizationId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
        );
        return;
      }

      const { error } = await supabase
        .from("properties")
        .update(payload)
        .eq("id", dialog.row.id)
        .eq("organization_id", orgId);

      if (error) {
        toast.error(t("common.toasts.saveFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("properties.venueUpdated"));
    } else {
      let orgId: string;
      try {
        orgId = requireOrganizationId(currentOrganizationId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
        );
        return;
      }

      const { error } = await supabase.from("properties").insert({
        ...payload,
        organization_id: orgId,
      });

      if (error) {
        toast.error(t("properties.createFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("properties.venueCreated"));
    }

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
    if (!deleteTarget || !currentOrganizationId) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("organization_id", currentOrganizationId);

      if (error) {
        toast.error(t("common.toasts.deleteFailed"), {
          description:
            error.code === "23503"
              ? t("properties.deleteInUse")
              : error.message,
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

  const isEdit = dialog.row != null;

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("properties.title")}
        description={
          setupMode
            ? t("properties.setupDescription")
            : t("properties.defaultDescription")
        }
        actions={
          canManage ? (
            <Button
              type="button"
              onClick={openCreate}
              className={cn(buttonVariants({ variant: "success", size: "cta" }))}
            >
              <Plus className="size-5" aria-hidden />
              {t("properties.newVenue")}
            </Button>
          ) : null
        }
      />

      {!loadError && properties.length > 0 ? (
        <div className={cn("min-w-0", RN_CARD_SHELL)}>
          <div className="px-5 py-4 md:px-6">
            <div className="relative min-w-0 w-full max-w-md">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("properties.searchPlaceholder")}
                className="h-12 w-full rounded-md border-2 border-rn-border-strong bg-background pl-12 text-app-base focus-visible:border-success focus-visible:ring-success/25"
                aria-label={t("properties.searchAria")}
              />
            </div>
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className={cn(RN_CARD_SHELL, "px-5 py-4 md:px-6")} role="alert">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t("properties.loadError", { error: loadError })}
          </div>
        </div>
      ) : null}

      {!loadError && properties.length === 0 ? (
        <div
          className={cn(
            RN_CARD_SHELL,
            "flex flex-col items-center gap-4 px-6 py-16 text-center md:px-8",
          )}
        >
          <div className="flex size-14 items-center justify-center rounded-md border border-rn-border-strong/70 bg-muted/30">
            <Building2 className="size-7 text-muted-foreground" aria-hidden />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {t("properties.emptyTitle")}
            </p>
            <p className="mt-2 max-w-md text-app-sm text-muted-foreground">
              {canManage
                ? t("properties.emptyCanManage")
                : t("properties.emptyReadOnly")}
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
            <p
              className={cn(
                RN_CARD_SHELL,
                "px-6 py-10 text-center text-muted-foreground md:px-8",
              )}
            >
              {t("properties.noSearchResults")}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  canManage={canManage}
                  onEdit={() => openEdit(p)}
                  onDelete={() => setDeleteTarget(p)}
                  t={t}
                />
              ))}
            </div>
          )}
          <p className="text-app-sm text-muted-foreground">
            {t("properties.showingCount", {
              filtered: filtered.length,
              total: properties.length,
            })}
          </p>
        </>
      ) : null}

      <Dialog open={dialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md border-2 border-rn-border-strong">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">
              {isEdit ? t("properties.editVenue") : t("properties.newVenue")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PropertyFields
              form={form}
              idPrefix={isEdit ? "edit" : "add"}
              t={t}
            />
            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" variant="success" size="cta">
                {isEdit ? t("common.actions.save") : t("common.actions.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("properties.deleteTitle")}
        description={
          deleteTarget
            ? t("properties.deleteDescription", { name: deleteTarget.name })
            : null
        }
        confirmLabel={t("properties.confirmDelete")}
        busy={deleteBusy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
