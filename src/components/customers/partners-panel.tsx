"use client";

import type { PartnerRow } from "@/components/customers/types";
import { CustomersPageSearchToolbar } from "@/components/customers/customers-page-search-toolbar";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteField } from "@/components/ui/autocomplete-field";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  PARTNER_CATEGORY_PRESETS,
  partnerFormSchema,
  type PartnerFormInput,
} from "@/lib/validations";
import { useTranslation } from "@/i18n/client";
import type { Translator } from "@/i18n/types";
import {
  RN_PAGE_SEARCH_ACTIONS,
} from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, type Resolver, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { TENANT_LIST_PAGE_SIZE } from "@/lib/list-pagination";

const partnersTableHeadClass =
  "customers-table-head px-6 py-4 font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-sm shadow-sm outline-none md:h-12 md:px-4 md:text-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

function partnerCategoryLabel(category: string, t: Translator): string {
  const preset = PARTNER_CATEGORY_PRESETS.find((p) => p.value === category);
  if (preset) {
    return t(`customers.partnerCategories.${preset.value}`);
  }
  return category;
}

function partnerLabelToCategoryLocalized(input: string, t: Translator): string {
  const trimmed = input.trim();
  for (const preset of PARTNER_CATEGORY_PRESETS) {
    const translated = t(`customers.partnerCategories.${preset.value}`);
    if (
      translated.toLowerCase() === trimmed.toLowerCase() ||
      preset.label.toLowerCase() === trimmed.toLowerCase()
    ) {
      return preset.value;
    }
  }
  return trimmed;
}

function partnerCategorySuggestions(t: Translator): string[] {
  return PARTNER_CATEGORY_PRESETS.map((p) =>
    t(`customers.partnerCategories.${p.value}`),
  );
}

function PartnerFields({
  form,
  idPrefix,
}: {
  form: UseFormReturn<PartnerFormInput>;
  idPrefix: string;
}) {
  const { t } = useTranslation();
  const { register, control, formState } = form;
  const err = formState.errors;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cat`}>{t("common.category")}</Label>
        <Controller
          name="category"
          control={control}
          render={({ field, fieldState }) => (
            <AutocompleteField
              id={`${idPrefix}-cat`}
              value={partnerCategoryLabel(field.value ?? "", t)}
              onValueChange={(value) =>
                field.onChange(partnerLabelToCategoryLocalized(value, t))
              }
              suggestions={partnerCategorySuggestions(t)}
              placeholder={t("customers.partnerForm.categoryPlaceholder")}
              aria-label={t("customers.partnerForm.categoryAria")}
              aria-invalid={fieldState.invalid}
              inputClassName={fieldClass}
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          {t("customers.partnerForm.categoryHint")}
        </p>
        {err.category ? (
          <p className="text-xs text-destructive">{err.category.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>{t("customers.partnerForm.nameCompany")}</Label>
        <Input id={`${idPrefix}-name`} {...register("name")} className={fieldClass} />
        {err.name ? (
          <p className="text-xs text-destructive">{err.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>{t("common.fields.phone")}</Label>
        <Input
          id={`${idPrefix}-phone`}
          {...register("phone")}
          className={fieldClass}
          inputMode="tel"
        />
        {err.phone ? (
          <p className="text-xs text-destructive">{err.phone.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>{t("common.fields.email")}</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          {...register("email")}
          className={fieldClass}
        />
        {err.email ? (
          <p className="text-xs text-destructive">{err.email.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>{t("common.fields.notes")}</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          {...register("notes")}
          rows={4}
          className={cn(fieldClass, "min-h-24 py-3")}
          placeholder={t("customers.partnerForm.notesPlaceholder")}
        />
        {err.notes ? (
          <p className="text-xs text-destructive">{err.notes.message}</p>
        ) : null}
      </div>
    </div>
  );
}

export function PartnersPanel({
  partners,
  showHeader = true,
  query: queryProp,
  onQueryChange: onQueryChangeProp,
  addOpen: addOpenProp,
  onAddOpenChange: onAddOpenChangeProp,
}: {
  partners: PartnerRow[];
  showHeader?: boolean;
  query?: string;
  onQueryChange?: (value: string) => void;
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateCustomers } = useTenantDataInvalidation();
  const [internalQuery, setInternalQuery] = useState("");
  const [partnersPage, setPartnersPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [partnerDeleteTarget, setPartnerDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const query = queryProp ?? internalQuery;
  const setQuery = onQueryChangeProp ?? setInternalQuery;
  const addOpen = addOpenProp ?? internalAddOpen;
  const setAddOpen = onAddOpenChangeProp ?? setInternalAddOpen;

  function handleQueryChange(value: string) {
    setQuery(value);
  }

  useEffect(() => {
    setPartnersPage(1);
  }, [query]);

  const addForm = useForm<PartnerFormInput>({
    resolver: zodResolver(partnerFormSchema) as Resolver<PartnerFormInput>,
    defaultValues: {
      category: "catering",
      name: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  const editForm = useForm<PartnerFormInput>({
    resolver: zodResolver(partnerFormSchema) as Resolver<PartnerFormInput>,
    defaultValues: {
      category: "catering",
      name: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  const selected = useMemo(
    () => partners.find((p) => p.id === selectedId) ?? null,
    [partners, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => {
      const hay = [
        p.name,
        p.email ?? "",
        p.phone ?? "",
        partnerCategoryLabel(p.category, t),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [partners, query, t]);

  const pagination = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filtered.length / TENANT_LIST_PAGE_SIZE),
    );
    const currentPage = Math.min(Math.max(1, partnersPage), totalPages);
    const start = (currentPage - 1) * TENANT_LIST_PAGE_SIZE;
    return {
      totalPages,
      currentPage,
      pageRows: filtered.slice(start, start + TENANT_LIST_PAGE_SIZE),
    };
  }, [filtered, partnersPage]);

  const { totalPages, currentPage, pageRows } = pagination;

  function openEdit(p: PartnerRow) {
    editForm.reset({
      category: p.category,
      name: p.name,
      phone: p.phone ?? "",
      email: p.email ?? "",
      notes: p.notes ?? "",
    });
    setSelectedId(p.id);
  }

  async function onAddPartner(data: PartnerFormInput) {
    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
      );
      return;
    }

    const { error } = await supabase.from("partners").insert({
      category: partnerLabelToCategoryLocalized(data.category, t),
      name: data.name,
      phone: data.phone.trim() || null,
      email: data.email.trim() || null,
      notes: data.notes?.trim() || null,
      organization_id: orgId,
    });

    if (error) {
      toast.error(t("customers.toasts.partnerCreateFailed"), {
        description: error.message,
      });
      return;
    }

    toast.success(t("customers.toasts.partnerRegistered"));
    addForm.reset({ category: "catering", name: "", phone: "", email: "", notes: "" });
    setAddOpen(false);
    invalidateCustomers();
  }

  async function onSavePartner(data: PartnerFormInput) {
    if (!selectedId || !currentOrganizationId) return;
    const { error } = await supabase
      .from("partners")
      .update({
        category: partnerLabelToCategoryLocalized(data.category, t),
        name: data.name,
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .eq("id", selectedId)
      .eq("organization_id", currentOrganizationId);

    if (error) {
      toast.error(t("common.toasts.saveFailed"), { description: error.message });
      return;
    }

    toast.success(t("common.toasts.saved"));
    invalidateCustomers();
  }

  async function performPartnerDelete(id: string) {
    if (!currentOrganizationId) return;
    setDeleteBusyId(id);
    try {
      const { error } = await supabase
        .from("partners")
        .delete()
        .eq("id", id)
        .eq("organization_id", currentOrganizationId);
      if (error) {
        toast.error(t("common.toasts.deleteFailed"), { description: error.message });
        return;
      }
      toast.success(t("customers.toasts.partnerDeleted"));
      if (selectedId === id) setSelectedId(null);
      invalidateCustomers();
    } finally {
      setDeleteBusyId(null);
    }
  }

  function requestDeletePartner(id: string, displayName: string) {
    setPartnerDeleteTarget({ id, name: displayName });
  }

  async function confirmPartnerDelete() {
    const target = partnerDeleteTarget;
    if (!target) return;
    setPartnerDeleteTarget(null);
    await performPartnerDelete(target.id);
  }

  function onDeletePartner() {
    if (!selected) return;
    requestDeletePartner(selectedId!, selected.name);
  }

  return (
    <>
      {showHeader ? (
        <div className="border-b-2 border-rn-border-strong bg-card/80 px-6 py-5 md:px-8 md:py-6">
          <div className="customers-page-hero">
            <AppPageHeader
              className="mb-0"
              surface="default"
              title={t("customers.partners")}
              titleClassName="customers-partners-hero"
              actionsClassName={RN_PAGE_SEARCH_ACTIONS}
              actions={
                <CustomersPageSearchToolbar
                  searchId="partners-search"
                  searchAriaLabel={t("customers.searchPartnersAria")}
                  searchPlaceholder={t("customers.searchPartnersPlaceholder")}
                  query={query}
                  onQueryChange={handleQueryChange}
                  addLabel={t("customers.newPartner")}
                  onAdd={() => setAddOpen(true)}
                  toolbarAriaLabel={t("customers.toolbarPartnersAria")}
                />
              }
            />
          </div>
        </div>
      ) : null}

      {partners.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center md:px-8 md:py-16">
          <p className="customers-empty-hint text-muted-foreground">
            {t("customers.emptyPartners")}
          </p>
        </div>
        ) : (
          <>
            <div className="app-table overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-app-base">
                <thead>
                  <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                    <th className={partnersTableHeadClass}>{t("common.fields.name")}</th>
                    <th className={partnersTableHeadClass}>{t("customers.table.category")}</th>
                    <th className={partnersTableHeadClass}>{t("common.fields.phone")}</th>
                    <th className={partnersTableHeadClass}>{t("common.fields.email")}</th>
                    <th className={cn(partnersTableHeadClass, "w-12 text-right")}>
                      <span className="sr-only">{t("customers.open")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rn-border-strong/50">
                  {pageRows.map((p) => {
                    const active = selectedId === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-rn-surface-row-hover",
                          active && "bg-rn-surface-row-hover",
                        )}
                        onClick={() => openEdit(p)}
                      >
                        <td
                          className={cn(
                            "customers-partners-row-name px-6 py-5 font-heading font-semibold md:px-8 md:py-6",
                            active ? "text-success" : "text-foreground",
                          )}
                        >
                          {p.name}
                        </td>
                        <td className="px-6 py-5 md:px-8 md:py-6">
                          <span
                            className={cn(
                              "customers-partners-category-pill inline-flex rounded-full border px-2.5 py-1 font-semibold md:px-3",
                              active
                                ? "border-success/35 bg-rn-surface-gradient-from text-success"
                                : "border-rn-border-strong bg-rn-surface-segment text-rn-text-body",
                            )}
                          >
                            {partnerCategoryLabel(p.category, t)}
                          </span>
                        </td>
                        <td className="customers-partners-row-meta px-6 py-5 md:px-8 md:py-6">
                          {p.phone ?? "—"}
                        </td>
                        <td className="customers-partners-row-meta px-6 py-5 md:px-8 md:py-6">
                          {p.email ?? "—"}
                        </td>
                        <td className="px-6 py-5 text-right md:px-8 md:py-6">
                          <div className="flex items-center justify-end">
                            <ChevronRight
                              className="size-6 shrink-0 text-muted-foreground md:size-7"
                              aria-hidden
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 ? (
              <div className="flex flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 font-medium text-rn-footer-text sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-6">
                <span>
                  {filtered.length <= TENANT_LIST_PAGE_SIZE
                    ? t("customers.footer.showingCount", {
                        count: filtered.length,
                        label:
                          filtered.length === 1
                            ? t("customers.footer.partnerWord")
                            : t("customers.footer.partnersWord"),
                      })
                    : t("customers.footer.showingRange", {
                        from:
                          (currentPage - 1) * TENANT_LIST_PAGE_SIZE + 1,
                        to: Math.min(
                          currentPage * TENANT_LIST_PAGE_SIZE,
                          filtered.length,
                        ),
                        total: filtered.length,
                      })}
                </span>
                {filtered.length > TENANT_LIST_PAGE_SIZE ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-1 rounded-md border-2 border-rn-border-strong px-4 text-base font-semibold"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setPartnersPage((p) => Math.max(1, p - 1))
                    }
                  >
                    <ChevronLeft className="size-5" aria-hidden />
                    {t("customers.footer.prev")}
                  </Button>
                  <span className="flex items-center px-2 tabular-nums">
                    {t("customers.footer.pageOf", {
                      current: currentPage,
                      total: totalPages,
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-1 rounded-md border-2 border-rn-border-strong px-4 text-base font-semibold"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setPartnersPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    {t("common.actions.next")}
                    <ChevronRight className="size-5" aria-hidden />
                  </Button>
                </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}

      <Sheet
        open={selectedId != null && selected != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className={cn(
            "w-full max-w-[min(100vw,36rem)] gap-0 border-l-2 border-rn-border-strong bg-card p-0 sm:max-w-[36rem]",
            "shadow-rn-card",
          )}
        >
          {selected ? (
            <div className="flex h-full flex-col">
              <SheetHeader className="flex flex-row items-center justify-between gap-4 border-b-2 border-rn-border-strong bg-rn-surface-table-head p-6">
                <SheetTitle className="app-card-title text-left">
                  {t("customers.partnerForm.editTitle")}
                </SheetTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md border-2 border-transparent hover:border-rn-border-strong/60"
                  aria-label={t("common.actions.close")}
                  onClick={() => setSelectedId(null)}
                >
                  <X className="size-5" aria-hidden />
                </Button>
              </SheetHeader>
              <form
                className="flex flex-1 flex-col overflow-hidden"
                onSubmit={editForm.handleSubmit(onSavePartner)}
              >
                <div className="flex-1 overflow-y-auto p-6">
                  <PartnerFields form={editForm} idPrefix="edit" />
                </div>
                <div className="flex flex-col gap-2 border-t-2 border-rn-border-strong bg-rn-surface-footer/50 p-6">
                  <Button type="submit" variant="success" size="cta" className="w-full">
                    {t("customers.partnerForm.save")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleteBusyId != null}
                    className="h-12 rounded-md border-2 border-destructive/40 text-base text-destructive hover:bg-destructive/10"
                    onClick={() => onDeletePartner()}
                  >
                    {t("customers.partnerForm.delete")}
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={partnerDeleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setPartnerDeleteTarget(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-[calc(100%-2rem)] gap-4 rounded-md border-2 border-rn-border-strong bg-card p-6 shadow-xl sm:max-w-md"
        >
          {partnerDeleteTarget ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="app-card-title">
                  {t("customers.partnerDelete.title")}
                </DialogTitle>
                <DialogDescription className="text-app-base leading-relaxed text-muted-foreground">
                  {t("customers.partnerDelete.description", {
                    name: partnerDeleteTarget.name,
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="cta"
                  className="w-full border-2 border-rn-border-strong sm:w-auto"
                  onClick={() => setPartnerDeleteTarget(null)}
                >
                  {t("common.actions.cancel")}
                </Button>
                <Button
                  type="button"
                  size="cta"
                  disabled={deleteBusyId != null}
                  className="w-full border-2 border-red-200 bg-red-600 !text-white hover:bg-red-700 sm:w-auto"
                  onClick={() => void confirmPartnerDelete()}
                >
                  {t("customers.partnerDelete.confirm")}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="app-card-title">{t("customers.partnerForm.newTitle")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={addForm.handleSubmit(onAddPartner)}
            className="space-y-4"
          >
            <PartnerFields form={addForm} idPrefix="add" />
            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" variant="success" size="cta">
                {t("customers.partnerForm.register")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}