"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  customerUpsertFormSchema,
  type CustomerUpsertFormInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Briefcase,
  Contact,
  Heart,
  History,
  PartyPopper,
  StickyNote,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import type { CustomerBookingListItem, CustomerRow } from "./types";

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

function formatMemberSince(createdAt: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    month: "long",
    year: "numeric",
  }).format(new Date(createdAt));
}

function formatBookingDate(dateStr: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

function bookingIconForType(eventType: string) {
  const t = eventType.toLowerCase();
  if (t.includes("bryllup"))
    return <Heart className="size-[18px] text-success" aria-hidden />;
  if (t.includes("bedrift"))
    return <Briefcase className="size-[18px] text-success" aria-hidden />;
  return <PartyPopper className="size-[18px] text-success" aria-hidden />;
}

type CustomerDrawerBodyProps = {
  customer: CustomerRow;
  stats: { count: number; spent: number; outstanding: number };
  bookings: CustomerBookingListItem[];
  onClose: () => void;
  onDeleteCustomer: () => void;
  deleteBusy?: boolean;
};

export function CustomerDrawerBody({
  customer,
  stats: s,
  bookings,
  onClose,
  onDeleteCustomer,
  deleteBusy = false,
}: CustomerDrawerBodyProps) {
  const supabase = useSupabase();
  const router = useRouter();
  const [notesDraft, setNotesDraft] = useState(() => customer.notes ?? "");
  const notesBaselineRef = useRef({
    customerId: customer.id,
    text: customer.notes ?? "",
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const editForm = useForm<CustomerUpsertFormInput>({
    resolver: zodResolver(
      customerUpsertFormSchema,
    ) as Resolver<CustomerUpsertFormInput>,
    defaultValues: {
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
    },
  });

  const persistNotes = useCallback(
    async (customerId: string, notes: string) => {
      const value = notes.trim() || null;
      const { error } = await supabase
        .from("customers")
        .update({ notes: value })
        .eq("id", customerId);
      if (error) {
        toast.error("Kunne ikke lagre notat", { description: error.message });
        return;
      }
      const display = value ?? "";
      notesBaselineRef.current = { customerId, text: display };
      setNotesDraft(display);
      toast.success("Notat lagret");
      router.refresh();
    },
    [supabase, router],
  );

  useEffect(() => {
    const base = notesBaselineRef.current;
    if (notesDraft === base.text && base.customerId === customer.id) {
      return;
    }
    const t = window.setTimeout(() => {
      void persistNotes(customer.id, notesDraft);
    }, 900);
    return () => window.clearTimeout(t);
  }, [notesDraft, customer.id, persistNotes]);

  async function onSaveProfile(data: CustomerUpsertFormInput) {
    setSavingProfile(true);
    const { error } = await supabase
      .from("customers")
      .update({
        name: data.name.trim(),
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
      })
      .eq("id", customer.id);

    setSavingProfile(false);

    if (error) {
      toast.error("Kunne ikke oppdatere kunde", { description: error.message });
      return;
    }

    toast.success("Profil oppdatert");
    setEditingProfile(false);
    router.refresh();
  }

  return (
    <>
      <SheetHeader className="flex-row justify-between gap-4 border-b-2 border-rn-border-strong bg-rn-surface-table-head px-8 pt-8 pb-4">
        <div className="flex flex-1 items-center gap-4 pr-10">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-md border-2 border-rn-accent-border bg-success text-xl font-bold text-white shadow-md">
            {customerInitials(customer.name)}
          </div>
          <div className="min-w-0">
            <SheetTitle className="font-heading text-xl font-semibold text-rn-text-heading">
              {customer.name}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Medlem siden {formatMemberSince(customer.created_at)}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-6 right-6 rounded-full"
          onClick={onClose}
          aria-label="Lukk"
        >
          <X className="size-5" aria-hidden />
        </Button>
      </SheetHeader>

      <div className="custom-scrollbar max-h-[calc(100vh-200px)] flex-1 space-y-8 overflow-y-auto px-8 pb-8 pt-4">
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Contact className="size-4 text-primary" aria-hidden />
              <h3 className="font-heading text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Kontakt
              </h3>
            </div>
            {!editingProfile ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 shrink-0 px-2 text-xs font-semibold text-primary hover:bg-primary/5"
                onClick={() => setEditingProfile(true)}
              >
                Rediger
              </Button>
            ) : null}
          </div>
          {editingProfile ? (
            <form
              onSubmit={editForm.handleSubmit(onSaveProfile)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold tracking-wide uppercase">
                  Navn
                </Label>
                <Input
                  className="h-11 rounded-md border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
                  {...editForm.register("name")}
                  aria-invalid={!!editForm.formState.errors.name}
                />
                {editForm.formState.errors.name ? (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.name.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold tracking-wide uppercase">
                  Telefon
                </Label>
                <Input
                  className="h-11 rounded-md border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
                  {...editForm.register("phone")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold tracking-wide uppercase">
                  E-post
                </Label>
                <Input
                  className="h-11 rounded-md border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
                  type="email"
                  {...editForm.register("email")}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-md"
                  onClick={() => {
                    setEditingProfile(false);
                    editForm.reset({
                      name: customer.name,
                      phone: customer.phone ?? "",
                      email: customer.email ?? "",
                    });
                  }}
                >
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  size="cta"
                  className="flex-1"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Lagrer…" : "Lagre"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border-2 border-rn-border-strong bg-rn-surface-segment p-4">
                <p className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">
                  Telefon
                </p>
                <p className="font-medium text-primary">
                  {customer.phone ?? "—"}
                </p>
              </div>
              <div className="rounded-md border-2 border-rn-border-strong bg-rn-surface-segment p-4">
                <p className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">
                  E-post
                </p>
                <p className="break-all font-medium text-primary">
                  {customer.email ?? "—"}
                </p>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="size-4 text-primary" aria-hidden />
            <h3 className="font-heading text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Betaling
            </h3>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 rounded-md border-2 border-success/15 bg-rn-surface-gradient-from p-5">
              <p className="mb-1 text-[10px] font-bold text-success/70 uppercase">
                Totalt brukt
              </p>
              <p className="text-xl font-bold text-success">
                {formatNok(s.spent)}
              </p>
            </div>
            <div className="flex-1 rounded-md border-2 border-rn-border-strong bg-card p-5 shadow-sm">
              <p className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">
                Utestående
              </p>
              <p
                className={cn(
                  "text-xl font-bold",
                  s.outstanding > 0 ? "text-destructive" : "text-foreground",
                )}
              >
                {formatNok(s.outstanding)}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" aria-hidden />
              <h3 className="font-heading text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Bookinghistorikk
              </h3>
            </div>
            <Link
              href="/app/bookings"
              className="text-xs font-bold text-primary hover:underline"
            >
              Alle bookinger
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ingen bookinger registrert ennå.
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 8).map((b) => (
                <div
                  key={b.id}
                  className="flex cursor-default items-center justify-between rounded-md border-2 border-rn-border-strong bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-rn-surface-gradient-from">
                      {bookingIconForType(b.event_type)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-primary">
                        {b.event_type} · {formatBookingDate(b.event_date)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.propertyName ?? "Lokale"} <span aria-hidden>·</span>{" "}
                        {b.guest_count} gjester
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <StickyNote className="size-4 text-primary" aria-hidden />
            <h3 className="font-heading text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Interne notater
            </h3>
          </div>
          <div className="relative">
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="min-h-32 resize-none rounded-md border-2 border-rn-border-strong p-4 text-sm focus-visible:border-success focus-visible:ring-success/25"
              placeholder="Legg til notat om kunden…"
            />
            <span className="pointer-events-none absolute right-3 bottom-3 text-[10px] font-bold text-muted-foreground uppercase">
              Autolagring
            </span>
          </div>
        </section>
      </div>

      <SheetFooter className="flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer/50 p-6">
        <Link
          href={`/app/bookings/new?customerId=${customer.id}`}
          className={cn(
            buttonVariants({ variant: "success", size: "cta" }),
            "w-full",
          )}
        >
          Ny booking
        </Link>
        <Button
          type="button"
          variant="outline"
          disabled={deleteBusy || s.count > 0 || editingProfile}
          title={
            s.count > 0
              ? "Kan ikke slette: kunden har bookinger"
              : "Slett kunde permanent"
          }
          className="h-12 w-full rounded-md border-2 border-destructive/40 text-base font-semibold text-destructive hover:bg-destructive/10"
          onClick={onDeleteCustomer}
        >
          <Trash2 className="mr-2 size-4 shrink-0" aria-hidden />
          Slett kunde
        </Button>
      </SheetFooter>
    </>
  );
}
