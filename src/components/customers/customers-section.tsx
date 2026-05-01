"use client";

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
import { ChevronRight, Plus, Search } from "lucide-react";
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
  "px-6 py-4 text-sm font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5 md:text-base";

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
    <header className="border-b-2 border-rn-border-strong bg-card/80 px-6 py-5 md:px-8 md:py-6">
      <AppPageHeader
        className="mb-0"
        title="Kunder"
        description="Kontakter, bookinger og partnere — søk og oppdater fra én oversikt."
        actions={
          <div
            className="flex w-full min-w-0 flex-col gap-3 md:max-w-none md:flex-row md:items-stretch md:justify-end md:gap-3 lg:gap-4"
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
                className="h-12 w-full rounded-2xl border-2 border-rn-border-strong bg-background pl-12 text-base text-foreground shadow-sm md:h-14 md:pl-14 md:text-[17px] focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                aria-label="Søk kunder"
              />
            </div>
            <Button
              type="button"
              onClick={onAdd}
              className={cn(
                buttonVariants({ variant: "default" }),
                "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-rn-accent-border bg-success px-6 font-heading text-base font-bold text-white shadow-md hover:bg-rn-accent-fill-hover lg:w-auto lg:min-w-44",
              )}
            >
              <Plus className="size-5" aria-hidden />
              Ny kunde
            </Button>
          </div>
        }
      />
    </header>
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

  const detailStats = selected
    ? stats.get(selected.id) ?? { count: 0, spent: 0, outstanding: 0 }
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pb-24 md:pb-8">
      {loadError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
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
          </div>

          {customers.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-4 overflow-hidden p-12 text-center",
                RN_CARD_SHELL,
              )}
            >
              <p className="text-base text-muted-foreground md:text-lg">
                Ingen kunder ennå. Legg til din første kunde for å komme i gang.
              </p>
            </div>
          ) : (
            <div className={cn("overflow-x-auto", RN_CARD_SHELL)}>
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
                        "text-right",
                      )}
                    >
                      {" "}
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
                                "font-heading text-base font-semibold md:text-lg",
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
                        <td className="px-6 py-5 text-base font-bold tabular-nums text-success md:px-8 md:py-6 md:text-lg">
                          {formatNok(st.spent)}
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
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="max-w-md rounded-2xl"
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
                className="h-11 rounded-xl border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
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
                className="h-11 rounded-xl border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
              />
            </div>
            <div className="space-y-2">
              <Label>E-post</Label>
              <Input
                type="email"
                {...addForm.register("email")}
                className="h-11 rounded-xl border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
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
              <Button
                type="submit"
                className="border-2 border-rn-accent-border bg-success text-white hover:bg-rn-accent-fill-hover"
              >
                Opprett
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
