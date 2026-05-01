"use client";

import type { PartnerRow } from "@/components/customers/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  PARTNER_CATEGORIES,
  partnerFormSchema,
  type PartnerFormInput,
} from "@/lib/validations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

const partnersTableHeadClass =
  "px-6 py-4 text-sm font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5 md:text-base";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

const fieldClass =
  "h-11 w-full rounded-xl border-2 border-rn-border-strong bg-background px-3.5 text-sm shadow-sm outline-none md:h-12 md:px-4 md:text-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

const selectPad = "pr-10 appearance-none bg-transparent";

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
        <select
          id={`${idPrefix}-cat`}
          {...register("category")}
          className={cn(fieldClass, selectPad)}
        >
          <option value="catering">Catering</option>
          <option value="decoration">Dekorasjon</option>
          <option value="cleaning">Renhold</option>
          <option value="other">Annet</option>
        </select>
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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    const { error } = await supabase.from("partners").insert({
      category: data.category,
      name: data.name,
      phone: data.phone.trim() || null,
      email: data.email.trim() || null,
      notes: data.notes?.trim() || null,
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

  async function onDeletePartner() {
    if (!selectedId) return;
    if (
      !confirm(
        "Slette denne partneren? Dette kan ikke angres.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.from("partners").delete().eq("id", selectedId);
      if (error) {
        toast.error("Kunne ikke slette", { description: error.message });
        return;
      }
      toast.success("Partner slettet");
      setSelectedId(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <header className="border-b-2 border-rn-border-strong bg-card/80 px-6 py-5 md:px-8 md:py-6">
          <div
            className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4 xl:gap-5"
            role="search"
            aria-label="Partnere — søk og ny partner"
          >
            <h2 className="font-heading text-3xl font-bold tracking-tight text-rn-text-heading md:text-4xl">
              Partnere &amp; leverandører
            </h2>
            <div className="flex w-full min-w-0 flex-col gap-3 md:min-w-0 md:flex-1 md:flex-row md:items-stretch md:justify-end md:gap-3 lg:gap-4">
              <div className="relative min-w-0 w-full md:flex-1 md:max-w-3xl">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Søk partner…"
                  className="h-12 w-full rounded-2xl border-2 border-rn-border-strong bg-background pl-12 text-base text-foreground shadow-sm md:h-14 md:pl-14 md:text-[17px] focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                  aria-label="Søk partnere"
                />
              </div>
              <Button
                type="button"
                onClick={() => setAddOpen(true)}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-rn-accent-border bg-success px-6 font-heading text-base font-bold text-white shadow-md hover:bg-rn-accent-fill-hover lg:w-auto lg:min-w-44",
                )}
              >
                <Plus className="size-5" aria-hidden />
                Ny partner
              </Button>
            </div>
          </div>
        </header>
      </div>

      {partners.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 overflow-hidden p-10 text-center",
            RN_CARD_SHELL,
          )}
        >
          <p className="text-base text-muted-foreground md:text-lg">
            Ingen partnere registrert ennå. Legg til catering, dekor, renhold
            eller andre.
          </p>
        </div>
      ) : (
        <div className={cn("overflow-x-auto", RN_CARD_SHELL)}>
          <table className="w-full min-w-[640px] text-left text-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={partnersTableHeadClass}>Kategori</th>
                <th className={partnersTableHeadClass}>Navn</th>
                <th className={partnersTableHeadClass}>Telefon</th>
                <th className={partnersTableHeadClass}>E-post</th>
                <th className={cn(partnersTableHeadClass, "text-right")}>
                  {" "}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {filtered.map((p) => {
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
                    <td className="px-6 py-5 md:px-8 md:py-6">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold md:px-3 md:text-sm",
                          active
                            ? "border-success/35 bg-rn-surface-gradient-from text-success"
                            : "border-rn-border-strong bg-rn-surface-segment text-rn-text-body",
                        )}
                      >
                        {partnerCategoryLabelNb(p.category)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-6 py-5 font-heading text-base font-semibold md:px-8 md:py-6 md:text-lg",
                        active ? "text-success" : "text-foreground",
                      )}
                    >
                      {p.name}
                    </td>
                    <td className="px-6 py-5 text-muted-foreground md:px-8 md:py-6 md:text-base">
                      {p.phone ?? "—"}
                    </td>
                    <td className="px-6 py-5 text-muted-foreground md:px-8 md:py-6 md:text-base">
                      {p.email ?? "—"}
                    </td>
                    <td className="px-6 py-5 text-right text-muted-foreground md:px-8 md:py-6">
                      <ChevronRight className="ml-auto size-5 md:size-6" aria-hidden />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
            "w-full max-w-[min(100vw,450px)] gap-0 border-l-2 border-rn-border-strong bg-card p-0 sm:max-w-[450px]",
            "shadow-rn-card",
          )}
        >
          {selected ? (
            <div className="flex h-full flex-col">
              <SheetHeader className="flex flex-row items-center justify-between gap-4 border-b-2 border-rn-border-strong bg-rn-surface-table-head p-6">
                <SheetTitle className="text-left font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
                  Rediger partner
                </SheetTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-xl border-2 border-transparent hover:border-rn-border-strong/60"
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
                  <Button
                    type="submit"
                    className="h-12 rounded-xl border-2 border-rn-accent-border bg-success text-base font-semibold text-white hover:bg-rn-accent-fill-hover"
                  >
                    Lagre
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleting}
                    className="h-12 rounded-xl border-2 border-destructive/40 text-base text-destructive hover:bg-destructive/10"
                    onClick={() => void onDeletePartner()}
                  >
                    Slett partner
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
              Ny partner
            </DialogTitle>
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
              <Button
                type="submit"
                className="border-2 border-rn-accent-border bg-success text-white hover:bg-rn-accent-fill-hover"
              >
                Registrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}