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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField, toStringOptions } from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import {
  PROPERTY_TYPES,
  propertyFormSchema,
  type PropertyFormInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

const tableHeadClass =
  "px-6 py-4 font-semibold tracking-wider text-rn-text-column uppercase text-xs md:px-8 md:py-5 md:text-sm";

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
}: {
  form: UseFormReturn<PropertyFormInput>;
  idPrefix: string;
}) {
  const { register, formState } = form;
  const err = formState.errors;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Navn</Label>
        <Input
          id={`${idPrefix}-name`}
          {...register("name")}
          className={fieldClass}
          placeholder="F.eks. Hovedlokale"
        />
        {err.name ? (
          <p className="text-xs text-destructive">{err.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-type`}>Type</Label>
        <FormSelectField
          name="type"
          control={form.control}
          id={`${idPrefix}-type`}
          className={fieldClass}
          placeholder="Ikke angitt"
          options={toStringOptions(PROPERTY_TYPES, propertyTypeLabel)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-address`}>Adresse</Label>
        <Input
          id={`${idPrefix}-address`}
          {...register("address")}
          className={fieldClass}
          placeholder="Valgfritt"
        />
        {err.address ? (
          <p className="text-xs text-destructive">{err.address.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notat</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          {...register("notes")}
          rows={4}
          className={cn(fieldClass, "min-h-24 py-3")}
          placeholder="Kapasitet, parkering, tilgang, …"
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

export type PropertiesSectionProps = {
  properties: PropertyListRow[];
  canManage: boolean;
  loadError: string | null;
};

export function PropertiesSection({
  properties,
  canManage,
  loadError,
}: PropertiesSectionProps) {
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
      const hay = [p.name, p.address ?? "", propertyTypeLabel(p.type), p.notes ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [properties, query]);

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

    if (dialog.row) {
      const { error } = await supabase
        .from("properties")
        .update(payload)
        .eq("id", dialog.row.id);

      if (error) {
        toast.error("Kunne ikke lagre", { description: error.message });
        return;
      }
      toast.success("Lokale oppdatert");
    } else {
      let orgId: string;
      try {
        orgId = requireOrganizationId(currentOrganizationId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Ingen aktiv organisasjon.",
        );
        return;
      }

      const { error } = await supabase.from("properties").insert({
        ...payload,
        organization_id: orgId,
      });

      if (error) {
        toast.error("Kunne ikke opprette lokale", {
          description: error.message,
        });
        return;
      }
      toast.success("Lokale registrert");
    }

    closeDialog();
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) {
        toast.error("Kunne ikke slette", {
          description:
            error.code === "23503"
              ? "Lokalet er i bruk på bookinger, inventar eller transaksjoner."
              : error.message,
        });
        return;
      }
      toast.success("Lokale slettet");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  const isEdit = dialog.row != null;

  return (
    <div className="mx-auto flex w-full flex-col gap-6 pb-24 md:pb-8">
      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="border-b-2 border-rn-border-strong bg-card/80 px-[length:var(--app-card-padding)] py-6 md:py-7">
          <AppPageHeader
            className="mb-0 gap-3 md:gap-4"
            surface="default"
            title="Lokaler"
            actions={
              canManage ? (
                <Button
                  type="button"
                  onClick={openCreate}
                  className={cn(buttonVariants({ variant: "success", size: "cta" }))}
                >
                  <Plus className="size-5" aria-hidden />
                  Nytt lokale
                </Button>
              ) : null
            }
            toolbar={
              <div className="relative min-w-0 w-full">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-rn-text-slate"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Søk lokale …"
                  className="h-12 w-full rounded-md border-2 border-rn-border-strong bg-background pl-12 text-app-base focus-visible:border-success focus-visible:ring-success/25 md:h-14"
                  aria-label="Søk lokaler"
                />
              </div>
            }
            toolbarClassName="pt-4"
          />
        </div>

        {loadError ? (
          <div className="border-t border-rn-border-strong/50 px-6 py-4 md:px-8" role="alert">
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Kunne ikke laste lokaler: {loadError}
            </div>
          </div>
        ) : null}

        {!loadError && properties.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center md:px-8">
            <div className="flex size-16 items-center justify-center rounded-md border-2 border-rn-border-strong bg-muted/40">
              <Building2 className="size-8 text-muted-foreground" aria-hidden />
            </div>
            <p className="max-w-md text-muted-foreground">
              Ingen lokaler registrert ennå.
              {canManage
                ? " Opprett ditt første lokale for å kunne knytte bookinger, inventar og transaksjoner."
                : " Be eier eller administrator om å legge inn lokaler."}
            </p>
            {canManage ? (
              <Button type="button" variant="success" size="cta" onClick={openCreate}>
                <Plus className="size-5" aria-hidden />
                Nytt lokale
              </Button>
            ) : null}
          </div>
        ) : null}

        {!loadError && properties.length > 0 ? (
          <div className="app-table overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-app-base">
              <thead>
                <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                  <th className={tableHeadClass}>Navn</th>
                  <th className={tableHeadClass}>Type</th>
                  <th className={tableHeadClass}>Adresse</th>
                  {canManage ? (
                    <th className={cn(tableHeadClass, "w-28 text-right")}>
                      <span className="sr-only">Handlinger</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-rn-border-strong/50">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-rn-surface-row-hover"
                  >
                    <td className="px-6 py-5 font-heading font-semibold text-foreground md:px-8 md:py-6">
                      {p.name}
                    </td>
                    <td className="px-6 py-5 md:px-8 md:py-6">
                      {propertyTypeLabel(p.type)}
                    </td>
                    <td className="px-6 py-5 text-rn-text-body md:px-8 md:py-6">
                      {p.address?.trim() || "—"}
                    </td>
                    {canManage ? (
                      <td className="px-6 py-5 text-right md:px-8 md:py-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-10 text-muted-foreground hover:text-foreground"
                            aria-label={`Rediger ${p.name}`}
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="size-5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-10 text-muted-foreground hover:text-destructive"
                            aria-label={`Slett ${p.name}`}
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="size-5" aria-hidden />
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="px-6 py-10 text-center text-muted-foreground md:px-8">
                Ingen treff på søket.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <Dialog open={dialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md border-2 border-rn-border-strong">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">
              {isEdit ? "Rediger lokale" : "Nytt lokale"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PropertyFields form={form} idPrefix={isEdit ? "edit" : "add"} />
            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Avbryt
              </Button>
              <Button type="submit" variant="success" size="cta">
                {isEdit ? "Lagre" : "Opprett"}
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
        title="Slett lokale?"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» fjernes permanent. Dette kan ikke gjøres hvis lokalet er knyttet til bookinger, inventar eller transaksjoner.`
            : null
        }
        confirmLabel="Ja, slett lokale"
        busy={deleteBusy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
