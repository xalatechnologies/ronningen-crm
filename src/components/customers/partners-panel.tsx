"use client";

import type { PartnerRow } from "@/components/customers/types";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  PARTNER_CATEGORIES,
  partnerFormSchema,
  type PartnerFormInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

const PARTNERS_PAGE_SIZE = 4;

const partnersTableHeadClass =
  "customers-table-head px-6 py-4 font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-sm shadow-sm outline-none md:h-12 md:px-4 md:text-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

function partnerCategoryLabelNb(category: string): string {
  switch (category) {
    case "catering":
      return "Catering";
    case "decoration":
      return "Dekorasjon";
    case "cleaning":
      return "Renhold";
    case "other":
      return "Annet";
    default:
      return category;
  }
}

function PartnerFields({
  form,
  idPrefix,
}: {
  form: UseFormReturn<PartnerFormInput>;
  idPrefix: string;
}) {
  const { register, formState } = form;
  const err = formState.errors;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cat`}>Kategori</Label>
        <NativeSelect id={`${idPrefix}-cat`} {...register("category")}>
          <option value="catering">Catering</option>
          <option value="decoration">Dekorasjon</option>
          <option value="cleaning">Renhold</option>
          <option value="other">Annet</option>
        </NativeSelect>
        {err.category ? (
          <p className="text-xs text-destructive">{err.category.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Navn / firma</Label>
        <Input id={`${idPrefix}-name`} {...register("name")} className={fieldClass} />
        {err.name ? (
          <p className="text-xs text-destructive">{err.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>Telefon</Label>
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
        <Label htmlFor={`${idPrefix}-email`}>E-post</Label>
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
        <Label htmlFor={`${idPrefix}-notes`}>Notat</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          {...register("notes")}
          rows={4}
          className={cn(fieldClass, "min-h-24 py-3")}
          placeholder="Valgfritt — avtalt pris, kontaktperson, …"
        />
        {err.notes ? (
          <p className="text-xs text-destructive">{err.notes.message}</p>
        ) : null}
      </div>
    </div>
  );
}

export function PartnersPanel({ partners }: { partners: PartnerRow[] }) {
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [partnersPage, setPartnersPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [partnerDeleteTarget, setPartnerDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

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
        partnerCategoryLabelNb(p.category),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [partners, query]);

  const pagination = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filtered.length / PARTNERS_PAGE_SIZE),
    );
    const currentPage = Math.min(Math.max(1, partnersPage), totalPages);
    const start = (currentPage - 1) * PARTNERS_PAGE_SIZE;
    return {
      totalPages,
      currentPage,
      pageRows: filtered.slice(start, start + PARTNERS_PAGE_SIZE),
    };
  }, [filtered, partnersPage]);

  const { totalPages, currentPage, pageRows } = pagination;

  function openEdit(p: PartnerRow) {
    const cat = p.category as PartnerFormInput["category"];
    const category = (PARTNER_CATEGORIES as readonly string[]).includes(p.category)
      ? cat
      : "other";
    editForm.reset({
      category,
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
        err instanceof Error ? err.message : "Ingen aktiv organisasjon.",
      );
      return;
    }

    const { error } = await supabase.from("partners").insert({
      category: data.category,
      name: data.name,
      phone: data.phone.trim() || null,
      email: data.email.trim() || null,
      notes: data.notes?.trim() || null,
      organization_id: orgId,
    });

    if (error) {
      toast.error("Kunne ikke opprette partner", {
        description: error.message,
      });
      return;
    }

    toast.success("Partner registrert");
    addForm.reset({ category: "catering", name: "", phone: "", email: "", notes: "" });
    setAddOpen(false);
    router.refresh();
  }

  async function onSavePartner(data: PartnerFormInput) {
    if (!selectedId) return;
    const { error } = await supabase
      .from("partners")
      .update({
        category: data.category,
        name: data.name,
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .eq("id", selectedId);

    if (error) {
      toast.error("Kunne ikke lagre", { description: error.message });
      return;
    }

    toast.success("Lagret");
    router.refresh();
  }

  async function performPartnerDelete(id: string) {
    setDeleteBusyId(id);
    try {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) {
        toast.error("Kunne ikke slette", { description: error.message });
        return;
      }
      toast.success("Partner slettet");
      if (selectedId === id) setSelectedId(null);
      router.refresh();
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
      <header className="border-b-2 border-rn-border-strong bg-card/80 px-6 py-5 md:px-8 md:py-6">
        <div
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4 xl:gap-5"
          role="search"
          aria-label="Partnere — søk og ny partner"
        >
            <h1 className="customers-partners-hero app-title">
              Partnere
            </h1>
          <div className="flex w-full min-w-0 flex-col gap-3 md:min-w-0 md:flex-1 md:flex-row md:items-stretch md:justify-end md:gap-3 lg:gap-4">
            <div className="relative min-w-0 w-full md:flex-1 md:max-w-3xl">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
                aria-hidden
              />
              <Input
                id="partners-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPartnersPage(1);
                }}
                placeholder="Søk partner…"
                className="h-12 w-full rounded-md border-2 border-rn-border-strong bg-background pl-12 text-app-base text-foreground shadow-sm md:h-14 md:pl-14 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                aria-label="Søk partnere"
              />
            </div>
            <Button
              type="button"
              onClick={() => setAddOpen(true)}
              className={cn(
                buttonVariants({ variant: "success", size: "cta" }),
                "lg:w-auto lg:min-w-44",
              )}
            >
              <Plus className="size-5" aria-hidden />
              Ny partner
            </Button>
          </div>
        </div>
      </header>

      {partners.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center md:px-8 md:py-16">
          <p className="customers-empty-hint text-muted-foreground">
            Ingen partnere registrert ennå. Legg til catering, dekor, renhold
            eller andre.
          </p>
        </div>
        ) : (
          <>
            <div className="app-table overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-app-base">
                <thead>
                  <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                    <th className={partnersTableHeadClass}>Navn</th>
                    <th className={partnersTableHeadClass}>Kategori</th>
                    <th className={partnersTableHeadClass}>Telefon</th>
                    <th className={partnersTableHeadClass}>E-post</th>
                    <th className={cn(partnersTableHeadClass, "w-12 text-right")}>
                      <span className="sr-only">Åpne</span>
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
                            {partnerCategoryLabelNb(p.category)}
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
                  Viser{" "}
                  {pageRows.length
                    ? (currentPage - 1) * PARTNERS_PAGE_SIZE + 1
                    : 0}
                  –
                  {Math.min(
                    currentPage * PARTNERS_PAGE_SIZE,
                    filtered.length,
                  )}{" "}
                  av {filtered.length}
                </span>
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
                    Forrige
                  </Button>
                  <span className="flex items-center px-2 tabular-nums">
                    Side {currentPage} / {totalPages}
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
                    Neste
                    <ChevronRight className="size-5" aria-hidden />
                  </Button>
                </div>
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
                  Rediger partner
                </SheetTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md border-2 border-transparent hover:border-rn-border-strong/60"
                  aria-label="Lukk"
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
                    Lagre
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleteBusyId != null}
                    className="h-12 rounded-md border-2 border-destructive/40 text-base text-destructive hover:bg-destructive/10"
                    onClick={() => onDeletePartner()}
                  >
                    Slett partner
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
                  Slette partner?
                </DialogTitle>
                <DialogDescription className="text-app-base leading-relaxed text-muted-foreground">
                  Du er i ferd med å slette «{partnerDeleteTarget.name}». Dette kan
                  ikke angres.
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
                  Avbryt
                </Button>
                <Button
                  type="button"
                  disabled={deleteBusyId != null}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "h-11 w-full rounded-md border-2 border-red-200 bg-red-600 font-semibold text-white hover:bg-red-700 sm:w-auto",
                  )}
                  onClick={() => void confirmPartnerDelete()}
                >
                  Ja, slett partner
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="app-card-title">Ny partner</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={addForm.handleSubmit(onAddPartner)}
            className="space-y-4"
          >
            <PartnerFields form={addForm} idPrefix="add" />
            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" variant="success" size="cta">
                Registrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}