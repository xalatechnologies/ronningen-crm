"use client";

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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  customerUpsertFormSchema,
  type CustomerUpsertFormInput,
} from "@/lib/validations";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { CustomerDrawerBody } from "./customer-drawer-body";
import { PartnersPanel } from "./partners-panel";
import type {
  CustomerBookingListItem,
  CustomerRow,
  PartnerRow,
} from "./types";

const customersTableHeadClass =
  "px-6 py-4 text-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";

export type { CustomerBookingListItem, PartnerRow } from "./types";

export type CustomersSectionProps = {
  customers: CustomerRow[];
  partners: PartnerRow[];
  bookings: CustomerBookingListItem[];
  loadError: string | null;
};

function customerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (
    (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  );
}

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function aggregateByCustomer(bookings: CustomerBookingListItem[]) {
  const map = new Map<
    string,
    { count: number; spent: number; outstanding: number }
  >();
  for (const b of bookings) {
    const cur =
      map.get(b.customer_id) ?? { count: 0, spent: 0, outstanding: 0 };
    cur.count += 1;
    cur.spent += Number(b.total_price);
    cur.outstanding += Number(b.remaining_amount);
    map.set(b.customer_id, cur);
  }
  return map;
}

function CustomersToolbar({
  query,
  onQueryChange,
  onAdd,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="border-b-2 border-rn-border-strong bg-card/80 px-6 py-5 md:px-8 md:py-6">
      <AppPageHeader
        className="mb-0"
        surface="default"
        title="Kunder"
        actions={
          <div
            className="flex w-full min-w-0 flex-col gap-3 md:min-w-0 md:flex-1 md:flex-row md:items-stretch md:justify-end md:gap-3 lg:gap-4"
            role="search"
            aria-label="Kunder — søk og ny kunde"
          >
            <div className="relative min-w-0 w-full md:flex-1 md:max-w-3xl">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Søk på navn, e-post eller telefon…"
                className="h-12 w-full rounded-md border-2 border-rn-border-strong bg-background pl-12 text-base text-foreground shadow-sm md:h-14 md:pl-14 md:text-[17px] focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                aria-label="Søk kunder"
              />
            </div>
            <Button
              type="button"
              onClick={onAdd}
              className={cn(
                buttonVariants({ variant: "success", size: "cta" }),
                "lg:w-auto lg:min-w-44",
              )}
            >
              <Plus className="size-5" aria-hidden />
              Ny kunde
            </Button>
          </div>
        }
      />
    </div>
  );
}

export function CustomersSection({
  customers,
  partners,
  bookings,
  loadError,
}: CustomersSectionProps) {
  const supabase = useSupabase();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [customerDeleteTarget, setCustomerDeleteTarget] =
    useState<CustomerRow | null>(null);

  const stats = useMemo(() => aggregateByCustomer(bookings), [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = [c.name, c.email ?? "", c.phone ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [customers, query]);

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? null,
    [customers, selectedId],
  );

  const selectedBookings = useMemo(
    () =>
      selectedId
        ? bookings.filter((b) => b.customer_id === selectedId)
        : [],
    [bookings, selectedId],
  );

  const addForm = useForm<CustomerUpsertFormInput>({
    resolver: zodResolver(
      customerUpsertFormSchema,
    ) as Resolver<CustomerUpsertFormInput>,
    defaultValues: { name: "", phone: "", email: "" },
  });

  async function onAddCustomer(data: CustomerUpsertFormInput) {
    const { data: row, error } = await supabase
      .from("customers")
      .insert({
        name: data.name.trim(),
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
      })
      .select("id")
      .single();

    if (error || !row) {
      toast.error("Kunne ikke opprette kunde", {
        description: error?.message ?? "Ukjent feil",
      });
      return;
    }

    toast.success("Kunde opprettet");
    addForm.reset();
    setAddOpen(false);
    setSelectedId(row.id);
    router.refresh();
  }

  async function performCustomerDelete(id: string) {
    setDeleteBusyId(id);
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) {
        toast.error("Kunne ikke slette", { description: error.message });
        return;
      }
      toast.success("Kunde slettet");
      if (selectedId === id) setSelectedId(null);
      router.refresh();
    } finally {
      setDeleteBusyId(null);
    }
  }

  function requestDeleteCustomer(c: CustomerRow, bookingCount: number) {
    if (bookingCount > 0) {
      toast.error("Kan ikke slette kunde", {
        description: `Kunden har ${bookingCount} ${bookingCount === 1 ? "booking" : "bookinger"}. Slett eller flytt dem først.`,
      });
      return;
    }
    setCustomerDeleteTarget(c);
  }

  async function confirmCustomerDelete() {
    const c = customerDeleteTarget;
    if (!c) return;
    setCustomerDeleteTarget(null);
    await performCustomerDelete(c.id);
  }

  const detailStats = selected
    ? stats.get(selected.id) ?? { count: 0, spent: 0, outstanding: 0 }
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pb-24 md:pb-8">
      {loadError ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          Kunne ikke laste data: {loadError}
        </div>
      ) : null}

      {!loadError ? (
        <>
          <PartnersPanel partners={partners} />

          <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
            <CustomersToolbar
              query={query}
              onQueryChange={setQuery}
              onAdd={() => setAddOpen(true)}
            />
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center md:px-8 md:py-16">
                <p className="text-base text-muted-foreground">
                  Ingen kunder ennå. Legg til din første kunde for å komme i gang.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-base">
                  <thead>
                    <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                      <th className={customersTableHeadClass}>Navn</th>
                      <th className={customersTableHeadClass}>Telefon</th>
                      <th className={customersTableHeadClass}>E-post</th>
                      <th className={customersTableHeadClass}>Bookinger</th>
                      <th className={customersTableHeadClass}>Totalt brukt</th>
                      <th
                        className={cn(
                          customersTableHeadClass,
                          "w-12 text-right",
                        )}
                      >
                        <span className="sr-only">Handling</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rn-border-strong/50">
                    {filtered.map((c) => {
                      const st = stats.get(c.id) ?? {
                        count: 0,
                        spent: 0,
                        outstanding: 0,
                      };
                      const isActive = selectedId === c.id;
                      return (
                        <tr
                          key={c.id}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-rn-surface-row-hover",
                            isActive && "bg-rn-surface-row-hover",
                          )}
                          onClick={() => setSelectedId(c.id)}
                        >
                          <td className="px-6 py-5 md:px-8 md:py-6">
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold md:size-11 md:text-base",
                                  isActive
                                    ? "bg-rn-surface-gradient-from text-success"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {customerInitials(c.name)}
                              </div>
                              <span
                                className={cn(
                                  "font-heading text-base font-semibold",
                                  isActive ? "text-success" : "text-foreground",
                                )}
                              >
                                {c.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-muted-foreground md:px-8 md:py-6 md:text-base">
                            {c.phone ?? "—"}
                          </td>
                          <td className="px-6 py-5 text-muted-foreground md:px-8 md:py-6 md:text-base">
                            {c.email ?? "—"}
                          </td>
                          <td className="px-6 py-5 md:px-8 md:py-6">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold md:px-3 md:text-sm",
                                st.count > 0
                                  ? "border border-success/25 bg-rn-surface-gradient-from text-success"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {st.count}{" "}
                              {st.count === 1 ? "arrangement" : "arrangementer"}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-base font-bold tabular-nums text-success md:px-8 md:py-6">
                            {formatNok(st.spent)}
                          </td>
                          <td
                            className="px-6 py-5 text-right md:px-8 md:py-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="size-10 shrink-0 rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-40"
                                aria-label={`Slett ${c.name}`}
                                title={
                                  st.count > 0
                                    ? "Kan ikke slette: kunden har bookinger"
                                    : `Slett ${c.name}`
                                }
                                disabled={deleteBusyId != null || st.count > 0}
                                onClick={() => requestDeleteCustomer(c, st.count)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                              <ChevronRight
                                className="size-5 shrink-0 text-muted-foreground md:size-6"
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
            )}
          </div>
        </>
      ) : null}

      <Sheet
        open={selectedId != null}
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
          {selected && detailStats ? (
            <CustomerDrawerBody
              key={selected.id}
              customer={selected}
              stats={detailStats}
              bookings={selectedBookings}
              deleteBusy={deleteBusyId != null}
              onClose={() => setSelectedId(null)}
              onDeleteCustomer={() =>
                requestDeleteCustomer(selected, detailStats.count)
              }
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={customerDeleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setCustomerDeleteTarget(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-[calc(100%-2rem)] gap-4 rounded-md border-2 border-rn-border-strong bg-card p-6 shadow-xl sm:max-w-md"
        >
          {customerDeleteTarget ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading">
                  Slette kunde?
                </DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-muted-foreground">
                  Du er i ferd med å slette «{customerDeleteTarget.name}». Alle
                  tilknyttede data som bare finnes på denne kunden forsvinner. Dette kan
                  ikke angres.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-md border-2 border-rn-border-strong sm:w-auto"
                  onClick={() => setCustomerDeleteTarget(null)}
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
                  onClick={() => void confirmCustomerDelete()}
                >
                  Ja, slett kunde
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="max-w-md rounded-md"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
              Ny kunde
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={addForm.handleSubmit(onAddCustomer)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Navn</Label>
              <Input
                {...addForm.register("name")}
                className="h-11 rounded-md border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
              />
              {addForm.formState.errors.name ? (
                <p className="text-xs text-destructive">
                  {addForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                {...addForm.register("phone")}
                className="h-11 rounded-md border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
              />
            </div>
            <div className="space-y-2">
              <Label>E-post</Label>
              <Input
                type="email"
                {...addForm.register("email")}
                className="h-11 rounded-md border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Avbryt
              </Button>
              <Button type="submit" variant="success" size="cta">
                Opprett
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
