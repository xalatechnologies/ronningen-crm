"use client";

import { InquiryFormBody } from "@/components/inquiries/inquiry-form-body";
import type { InquiryActivityRow, InquiryListRow } from "@/components/inquiries/types";
import { INQUIRY_STATUS_LABELS } from "@/components/inquiries/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  bookingInquiryFormSchema,
  inquiryActivityNoteSchema,
  type BookingInquiryFormInput,
  type BookingInquiryFormStatus,
  type BookingInquiryStatus,
} from "@/lib/validations";
import { formatAppDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";
import Link from "next/link";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function statusForForm(s: BookingInquiryStatus): BookingInquiryFormStatus {
  switch (s) {
    case "new":
    case "contacted":
    case "quote_sent":
    case "awaiting_customer":
    case "lost":
      return s;
    case "converted":
      return "awaiting_customer";
    default:
      return "new";
  }
}

function inquiryToFormDefaults(inquiry: InquiryListRow): BookingInquiryFormInput {
  const et =
    inquiry.eventType === "Bedrift" || inquiry.eventType === "Privat"
      ? inquiry.eventType
      : "Privat";
  return {
    customerId: inquiry.customerId,
    newCustomerName: "",
    newCustomerPhone: "",
    newCustomerEmail: "",
    newCustomerAddress: "",
    propertyId: inquiry.propertyId ?? "",
    eventType: et,
    festType: inquiry.festType ?? "",
    preferredEventDate: inquiry.preferredEventDateIso ?? "",
    preferredEventEndDate: inquiry.preferredEventEndDateIso ?? "",
    guestCount: inquiry.guestCount,
    estimatedTotal: inquiry.estimatedTotal ?? undefined,
    status: statusForForm(inquiry.status),
    nextFollowUpAt: toDatetimeLocalValue(inquiry.nextFollowUpAtIso),
    internalNotes: inquiry.internalNotes ?? "",
  };
}

type RawActivity = {
  id: string;
  inquiry_id: string;
  body: string;
  kind: string;
  created_at: string;
};

function mapRawActivities(data: RawActivity[]): InquiryActivityRow[] {
  return data.map((r) => ({
    id: r.id,
    inquiryId: r.inquiry_id,
    body: r.body,
    kind: r.kind,
    createdAtIso: r.created_at,
  }));
}

export function InquiryDetailSheet({
  inquiry,
  open,
  onOpenChange,
  properties,
  customers,
  canManage,
}: {
  inquiry: InquiryListRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  canManage: boolean;
}) {
  const supabase = useSupabase();
  const { invalidateInquiries, invalidateBookings } = useTenantDataInvalidation();
  const [activities, setActivities] = useState<InquiryActivityRow[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteBody, setEditingNoteBody] = useState("");
  const [editingNoteBusy, setEditingNoteBusy] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteNoteBusy, setDeleteNoteBusy] = useState(false);

  const isConverted =
    inquiry?.status === "converted" || !!inquiry?.convertedBookingId;

  const form = useForm<BookingInquiryFormInput>({
    resolver: zodResolver(bookingInquiryFormSchema) as Resolver<
      BookingInquiryFormInput,
      unknown,
      BookingInquiryFormInput
    >,
    defaultValues: inquiry
      ? inquiryToFormDefaults(inquiry)
      : {
          customerId: "",
          newCustomerName: "",
          newCustomerPhone: "",
          newCustomerEmail: "",
          newCustomerAddress: "",
          propertyId: "",
          eventType: "Privat",
          festType: "",
          preferredEventDate: "",
          preferredEventEndDate: "",
          guestCount: 0,
          estimatedTotal: undefined,
          status: "new",
          nextFollowUpAt: "",
          internalNotes: "",
        },
  });

  const {
    register: registerNote,
    handleSubmit: handleSubmitNote,
    reset: resetNote,
    getValues: getNoteValues,
    formState: { errors: noteErrors },
  } = useForm<{ body: string }>({
    resolver: zodResolver(inquiryActivityNoteSchema) as Resolver<
      { body: string },
      unknown,
      { body: string }
    >,
    defaultValues: { body: "" },
  });

  useEffect(() => {
    if (!inquiry || !open) {
      return;
    }
    form.reset(inquiryToFormDefaults(inquiry));
  }, [inquiry, open, form]);

  useEffect(() => {
    if (!inquiry || !open || !supabase) {
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load activities when inquiry sheet opens
    setLoadingActivities(true);
    void (async () => {
      const { data, error } = await supabase
        .from("booking_inquiry_activities")
        .select("id, inquiry_id, body, kind, created_at")
        .eq("inquiry_id", inquiry.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (error) {
          toast.error("Kunne ikke laste aktiviteter", {
            description: error.message,
          });
          setActivities([]);
        } else {
          setActivities(mapRawActivities((data ?? []) as RawActivity[]));
        }
        setLoadingActivities(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inquiry?.id, open, supabase]);

  useEffect(() => {
    if (!open) {
      resetNote({ body: "" });
      setEditingNoteId(null);
      setDeleteNoteId(null);
    }
  }, [open, resetNote]);

  const refreshActivities = useCallback(async () => {
    if (!inquiry || !supabase) return;
    const { data, error } = await supabase
      .from("booking_inquiry_activities")
      .select("id, inquiry_id, body, kind, created_at")
      .eq("inquiry_id", inquiry.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Kunne ikke laste aktiviteter", { description: error.message });
      return;
    }
    setActivities(mapRawActivities((data ?? []) as RawActivity[]));
  }, [inquiry, supabase]);

  async function insertActivityNote(body: string): Promise<boolean> {
    if (!inquiry || !supabase || !canManage) return false;
    const trimmed = body.trim();
    if (!trimmed) return true;

    const parsed = inquiryActivityNoteSchema.safeParse({ body: trimmed });
    if (!parsed.success) {
      toast.error("Kunne ikke lagre notat", {
        description: parsed.error.issues[0]?.message,
      });
      return false;
    }

    const { error } = await supabase.from("booking_inquiry_activities").insert({
      inquiry_id: inquiry.id,
      body: parsed.data.body,
      kind: "note",
    });
    if (error) {
      toast.error("Kunne ikke lagre notat", { description: error.message });
      return false;
    }
    return true;
  }

  async function onSave(data: BookingInquiryFormInput) {
    if (!inquiry || !supabase || isConverted || !canManage) return;

    const pendingNote = getNoteValues("body");

    const { error } = await supabase
      .from("booking_inquiries")
      .update({
        property_id: data.propertyId || null,
        event_type: data.eventType,
        fest_type: data.festType.trim() || null,
        preferred_event_date: data.preferredEventDate.trim() || null,
        preferred_event_end_date: data.preferredEventEndDate.trim() || null,
        guest_count: data.guestCount,
        estimated_total:
          data.estimatedTotal === undefined || Number.isNaN(data.estimatedTotal)
            ? null
            : data.estimatedTotal,
        status: data.status,
        next_follow_up_at: fromDatetimeLocalValue(data.nextFollowUpAt),
        internal_notes: data.internalNotes?.trim() || null,
      })
      .eq("id", inquiry.id);

    if (error) {
      toast.error("Kunne ikke lagre", { description: error.message });
      return;
    }

    if (pendingNote.trim()) {
      const noteSaved = await insertActivityNote(pendingNote);
      if (!noteSaved) {
        toast.success("Forespørsel oppdatert");
        invalidateInquiries();
        return;
      }
      resetNote({ body: "" });
    }

    toast.success(
      pendingNote.trim()
        ? "Forespørsel og notat lagret"
        : "Forespørsel oppdatert",
    );
    invalidateInquiries();
    onOpenChange(false);
  }

  async function confirmDeleteInquiry() {
    if (!inquiry || !supabase || !canManage || isConverted) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from("booking_inquiries")
        .delete()
        .eq("id", inquiry.id);
      if (error) {
        toast.error("Kunne ikke slette", { description: error.message });
        return;
      }
      toast.success("Forespørsel slettet");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      invalidateInquiries();
    } finally {
      setDeleteBusy(false);
    }
  }

  async function onAddNote(values: { body: string }) {
    if (!inquiry || !supabase || !canManage) return;
    const saved = await insertActivityNote(values.body);
    if (!saved) return;
    toast.success("Notat lagt til");
    resetNote({ body: "" });
    await refreshActivities();
    invalidateInquiries();
  }

  async function onSaveNoteEdit() {
    if (!editingNoteId || !supabase || !canManage) return;
    const parsed = inquiryActivityNoteSchema.safeParse({
      body: editingNoteBody,
    });
    if (!parsed.success) {
      toast.error("Kunne ikke oppdatere notat", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }
    setEditingNoteBusy(true);
    try {
      const { error } = await supabase
        .from("booking_inquiry_activities")
        .update({ body: parsed.data.body })
        .eq("id", editingNoteId);
      if (error) {
        toast.error("Kunne ikke oppdatere notat", { description: error.message });
        return;
      }
      toast.success("Notat oppdatert");
      setEditingNoteId(null);
      await refreshActivities();
      invalidateInquiries();
    } finally {
      setEditingNoteBusy(false);
    }
  }

  async function confirmDeleteNote() {
    if (!deleteNoteId || !supabase || !canManage) return;
    setDeleteNoteBusy(true);
    try {
      const { error } = await supabase
        .from("booking_inquiry_activities")
        .delete()
        .eq("id", deleteNoteId);
      if (error) {
        toast.error("Kunne ikke slette notat", { description: error.message });
        return;
      }
      toast.success("Notat slettet");
      if (editingNoteId === deleteNoteId) setEditingNoteId(null);
      setDeleteNoteId(null);
      await refreshActivities();
      invalidateInquiries();
    } finally {
      setDeleteNoteBusy(false);
    }
  }

  if (!inquiry) return null;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full max-h-dvh w-[min(100%,92vw)] max-w-2xl flex-col gap-0 overflow-hidden p-0 lg:max-w-3xl"
        showCloseButton
      >
        <SheetHeader className="shrink-0 border-b-2 border-rn-border-strong bg-rn-surface-table-head px-6 py-5 sm:px-8 sm:py-6">
          <SheetTitle className="font-heading text-left text-xl font-bold tracking-tight text-rn-text-heading">
            {inquiry.customerName}
          </SheetTitle>
          <SheetDescription className="text-left text-base text-muted-foreground">
            Forespørsel · Oppdatert{" "}
            {formatAppDateTime(inquiry.updatedAtIso)}
          </SheetDescription>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md border-2 px-3 py-1 text-sm font-semibold",
                isConverted
                  ? "border-success/50 bg-success/15 text-success"
                  : inquiry.status === "lost"
                    ? "border-muted-foreground/40 bg-muted/40"
                    : "border-rn-border-strong bg-card",
              )}
            >
              {INQUIRY_STATUS_LABELS[inquiry.status]}
            </span>
            {inquiry.convertedBookingId ? (
              <span className="app-meta text-muted-foreground">
                Booking-ID:{" "}
                <span className="font-mono text-foreground">
                  {inquiry.convertedBookingId.slice(0, 8)}…
                </span>
              </span>
            ) : null}
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-7">
              {isConverted ? (
                <div className="rounded-md border-2 border-success/35 bg-success/10 px-4 py-3 text-sm text-foreground">
                  Denne forespørselen er konvertert til booking. Gå til{" "}
                  <Link
                    href="/app/bookings"
                    className="font-semibold text-success underline underline-offset-2"
                  >
                    Bookinger
                  </Link>{" "}
                  for å redigere oppdraget.
                </div>
              ) : null}

              {isConverted ? (
                <div className="space-y-3 text-sm">
                  <p className="font-semibold text-rn-text-heading">Kontakt</p>
                  <p className="text-muted-foreground">
                    Telefon: {inquiry.customerPhone ?? "—"}
                  </p>
                  <p className="text-muted-foreground">
                    E-post: {inquiry.customerEmail ?? "—"}
                  </p>
                  <p className="font-semibold text-rn-text-heading">Ønske</p>
                  <p>
                    {inquiry.eventType}
                    {inquiry.festType ? ` · ${inquiry.festType}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    Lokale: {inquiry.propertyName ?? "—"}
                  </p>
                  <p className="text-muted-foreground">
                    Dato:{" "}
                    {inquiry.preferredEventDateIso
                      ? format(
                          new Date(
                            `${inquiry.preferredEventDateIso}T12:00:00`,
                          ),
                          "d. MMM yyyy",
                          { locale: nb },
                        )
                      : "—"}
                    {inquiry.preferredEventEndDateIso &&
                    inquiry.preferredEventEndDateIso !==
                      inquiry.preferredEventDateIso
                      ? ` – ${format(
                          new Date(
                            `${inquiry.preferredEventEndDateIso}T12:00:00`,
                          ),
                          "d. MMM yyyy",
                          { locale: nb },
                        )}`
                      : null}
                  </p>
                  <p className="text-muted-foreground">
                    Gjestforslag: {inquiry.guestCount}
                  </p>
                </div>
              ) : (
                <form
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void form.handleSubmit(onSave)();
                  }}
                >
                  <InquiryFormBody
                    register={form.register}
                    control={form.control}
                    watch={form.watch}
                    errors={form.formState.errors}
                    properties={properties}
                    customers={customers}
                    disabled={!canManage}
                    lockCustomer
                  />
                </form>
              )}

              <div className="border-t-2 border-rn-border-strong pt-6">
                <h3 className="font-heading text-lg font-semibold text-rn-text-heading">
                  Aktivitet
                </h3>
                {canManage ? (
                  <form
                    className="mt-4 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSubmitNote(onAddNote)();
                    }}
                  >
                    <Label htmlFor="inq-act-note" className="text-xs uppercase">
                      Nytt notat
                    </Label>
                    <Textarea
                      id="inq-act-note"
                      rows={3}
                      className="rounded-md border-2 border-rn-border-strong bg-background p-3 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                      {...registerNote("body")}
                    />
                    {noteErrors.body ? (
                      <p className="text-sm text-destructive">
                        {noteErrors.body.message}
                      </p>
                    ) : null}{" "}
                    <Button type="submit" variant="outline" size="sm">
                      Legg til
                    </Button>
                  </form>
                ) : null}

                <ul className="mt-4 flex flex-col gap-3">
                  {loadingActivities ? (
                    <li className="text-sm text-muted-foreground">
                      Laster aktivitet …
                    </li>
                  ) : activities.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      Ingen notater ennå.
                    </li>
                  ) : (
                    activities.map((a) => {
                      const isNote = a.kind === "note";
                      const isEditing = editingNoteId === a.id;

                      return (
                        <li
                          key={a.id}
                          className="rounded-md border border-rn-border-strong/60 bg-muted/25 px-3 py-2 text-sm"
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                rows={3}
                                value={editingNoteBody}
                                onChange={(e) => setEditingNoteBody(e.target.value)}
                                className="rounded-md border-2 border-rn-border-strong bg-background p-3 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                                aria-label="Rediger notat"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={editingNoteBusy}
                                  onClick={() => void onSaveNoteEdit()}
                                >
                                  {editingNoteBusy ? "Lagrer…" : "Lagre notat"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={editingNoteBusy}
                                  onClick={() => setEditingNoteId(null)}
                                >
                                  Avbryt
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 flex-1 whitespace-pre-wrap text-foreground">
                                  {a.body}
                                </p>
                                {isNote && canManage ? (
                                  <div className="flex shrink-0 items-center gap-0.5">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      className="size-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
                                      aria-label="Rediger notat"
                                      onClick={() => {
                                        setEditingNoteId(a.id);
                                        setEditingNoteBody(a.body);
                                      }}
                                    >
                                      <Pencil className="size-4" aria-hidden />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      className="size-8 shrink-0 rounded-md text-destructive hover:bg-destructive/10"
                                      aria-label="Slett notat"
                                      onClick={() => setDeleteNoteId(a.id)}
                                    >
                                      <Trash2 className="size-4" aria-hidden />
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatAppDateTime(a.createdAtIso)}
                                {!isNote ? " · Statusendring" : null}
                              </p>
                            </>
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          </div>

          {!isConverted && canManage ? (
            <div className="flex shrink-0 flex-col gap-3 border-t-2 border-rn-border-strong bg-muted/35 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-8 sm:py-4">
              <Button
                type="button"
                variant="destructive"
                size="cta"
                className="w-full sm:w-auto"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Slett forespørsel
              </Button>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-3">
                <Link
                  href={`/app/bookings/new?inquiryId=${inquiry.id}`}
                  className={cn(
                    buttonVariants({ variant: "success", size: "cta" }),
                    "inline-flex w-full justify-center sm:w-auto",
                  )}
                >
                  Opprett booking
                </Link>
                <Button
                  type="button"
                  variant="default"
                  size="cta"
                  className="w-full sm:w-auto"
                  disabled={form.formState.isSubmitting}
                  onClick={() => void form.handleSubmit(onSave)()}
                >
                  Lagre endringer
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>

    <ConfirmDeleteDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="Slette forespørsel?"
      description={
        inquiry
          ? `Forespørselen for ${inquiry.customerName} slettes permanent, inkludert notater og aktivitet. Dette kan ikke angres.`
          : null
      }
      confirmLabel="Ja, slett forespørsel"
      busy={deleteBusy}
      onConfirm={confirmDeleteInquiry}
    />

    <ConfirmDeleteDialog
      open={deleteNoteId !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setDeleteNoteId(null);
      }}
      title="Slette notat?"
      description="Notatet fjernes fra aktivitetsloggen. Dette kan ikke angres."
      confirmLabel="Ja, slett notat"
      busy={deleteNoteBusy}
      onConfirm={confirmDeleteNote}
    />
    </>
  );
}
