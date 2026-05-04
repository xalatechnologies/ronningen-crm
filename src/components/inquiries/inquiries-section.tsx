"use client";

import { InquiryDetailSheet } from "@/components/inquiries/inquiry-detail-sheet";
import { InquiriesFollowUpMonthCalendar } from "@/components/inquiries/inquiries-follow-up-calendar";
import type { InquiryListRow } from "@/components/inquiries/types";
import { INQUIRY_STATUS_LABELS } from "@/components/inquiries/types";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  BOOKING_INQUIRY_STATUSES,
  type BookingInquiryStatus,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { format, isBefore } from "date-fns";
import { nb } from "date-fns/locale";
import { Inbox, Plus, Search, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const tableHeadClass =
  "font-semibold tracking-wider text-rn-text-column uppercase text-xs md:text-sm";

const filterEyebrowClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

function statusBadgeClass(status: BookingInquiryStatus): string {
  if (status === "converted")
    return "border-success/50 bg-success/15 text-success";
  if (status === "lost") return "border-muted-foreground/40 bg-muted/50";
  return "border-rn-border-strong bg-card";
}

export type InquiriesSectionProps = {
  inquiries: InquiryListRow[];
  properties: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  canManageInquiries: boolean;
  loadError: string | null;
};

export function InquiriesSection({
  inquiries,
  properties,
  customers,
  canManageInquiries,
  loadError,
}: InquiriesSectionProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | BookingInquiryStatus>(
    "",
  );
  const [dueOnly, setDueOnly] = useState(false);
  const [selected, setSelected] = useState<InquiryListRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    return inquiries.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (dueOnly) {
        if (row.status === "converted" || row.convertedBookingId) return false;
        if (!row.nextFollowUpAtIso) return false;
        const d = new Date(row.nextFollowUpAtIso);
        if (Number.isNaN(d.getTime())) return false;
        if (isBefore(now, d)) return false;
      }
      if (!q) return true;
      const blob = [
        row.customerName,
        row.customerPhone ?? "",
        row.customerEmail ?? "",
        row.propertyName ?? "",
        row.festType ?? "",
        row.eventType,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [inquiries, query, statusFilter, dueOnly]);

  function openRow(row: InquiryListRow) {
    setSelected(row);
    setSheetOpen(true);
  }

  return (
    <div className="inquiries-page-workspace mx-auto flex w-full flex-col gap-8 pb-24 md:pb-8">
      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="border-b-2 border-rn-border-strong bg-card/80 px-[length:var(--app-card-padding)] py-6 md:py-7">
          <AppPageHeader
            className="mb-0 gap-3 md:gap-4"
            surface="default"
            title="Forespørsler"
            actions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!loadError ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="cta"
                    className="gap-2 border-2 border-rn-border-strong font-semibold"
                    aria-expanded={showCalendarView}
                    onClick={() => setShowCalendarView((v) => !v)}
                  >
                    <Calendar className="size-5 shrink-0" aria-hidden />
                    {showCalendarView ? "Vis liste" : "Oppfølgingskalender"}
                  </Button>
                ) : null}
                {canManageInquiries ? (
                  <Link
                    href="/app/inquiries/new"
                    className={cn(
                      buttonVariants({ variant: "success", size: "cta" }),
                      "inline-flex items-center justify-center gap-2",
                    )}
                  >
                    <Plus className="size-5" aria-hidden />
                    Ny forespørsel
                  </Link>
                ) : null}
              </div>
            }
          />
        </div>

        {loadError ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="alert"
          >
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
              Kunne ikke laste data: {loadError}
            </div>
          </div>
        ) : null}

        {!loadError ? (
          <div
            className="border-t border-rn-border-strong/50 bg-linear-to-b from-muted/10 to-transparent px-4 py-4 sm:px-5 lg:px-6 lg:py-5"
            role="search"
            aria-label="Søk og filtrer forespørsler"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
              <div className="min-w-0 flex-1 lg:max-w-xl">
                <Label htmlFor="inquiries-search" className={filterEyebrowClass}>
                  Søk
                </Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground sm:left-4"
                    aria-hidden
                  />
                  <Input
                    id="inquiries-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Kunde, telefon, lokale, type …"
                    className="h-11 w-full rounded-md border-2 border-rn-border-strong bg-background pl-11 text-sm sm:h-12 sm:pl-12 sm:text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
                <div className="w-full shrink-0 sm:w-52 md:w-56">
                  <Label
                    htmlFor="inquiries-status-filter"
                    className={filterEyebrowClass}
                  >
                    Status
                  </Label>
                  <NativeSelect
                    id="inquiries-status-filter"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as "" | BookingInquiryStatus)
                    }
                    aria-label="Filtrer etter status"
                    className="h-11 min-h-11 text-sm sm:h-12 sm:min-h-12 sm:text-base"
                  >
                    <option value="">Alle statuser</option>
                    {BOOKING_INQUIRY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {INQUIRY_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex sm:shrink-0 sm:pb-px">
                  <label
                    htmlFor="inquiries-due-only"
                    className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md border-2 border-rn-border-strong/60 bg-card px-3 py-2 text-sm font-medium text-rn-text-body shadow-sm transition-colors hover:border-rn-border-strong hover:bg-muted/20 sm:min-h-12 sm:w-auto sm:px-3.5"
                  >
                    <input
                      id="inquiries-due-only"
                      type="checkbox"
                      checked={dueOnly}
                      onChange={(e) => setDueOnly(e.target.checked)}
                      className="size-4 shrink-0 rounded border-2 border-rn-border-strong text-success focus-visible:ring-2 focus-visible:ring-success/30"
                    />
                    <span className="leading-snug">Kun forfalte oppfølginger</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!loadError && filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-md border-2 border-rn-border-strong bg-muted/40">
              <Inbox className="size-8 text-muted-foreground" aria-hidden />
            </div>
            <p className="max-w-sm text-muted-foreground">
              {inquiries.length === 0
                ? "Ingen forespørsler ennå. Bruk «Ny forespørsel» for å registrere første henvendelse."
                : "Ingen rader samsvarer med filter eller søk."}
            </p>
          </div>
        ) : null}

        {!loadError && filtered.length > 0 && showCalendarView ? (
          <InquiriesFollowUpMonthCalendar
            rows={filtered}
            totalInquiriesCount={inquiries.length}
            onSelectInquiry={openRow}
          />
        ) : null}

        {!loadError && filtered.length > 0 && !showCalendarView ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow className="border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
                  <TableHead className={cn(tableHeadClass, "pl-6 md:pl-8")}>
                    Kunde
                  </TableHead>
                  <TableHead className={tableHeadClass}>Lokale</TableHead>
                  <TableHead className={tableHeadClass}>Ønsket dato</TableHead>
                  <TableHead className={tableHeadClass}>Status</TableHead>
                  <TableHead className={tableHeadClass}>Neste oppfølging</TableHead>
                  <TableHead className={cn(tableHeadClass, "pr-6 text-right md:pr-8")}>
                    Oppdatert
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "group cursor-pointer border-rn-border-strong/40 hover:bg-rn-surface-row-hover",
                      row.status === "converted" && "opacity-90",
                    )}
                    onClick={() => openRow(row)}
                    aria-label={`Åpne forespørsel: ${row.customerName}`}
                  >
                    <TableCell className="px-6 py-4 font-medium text-rn-text-heading md:px-8 md:py-5">
                      {row.customerName}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-rn-text-body md:px-8 md:py-5">
                      {row.propertyName ?? "—"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-rn-text-body md:px-8 md:py-5 tabular-nums">
                      {row.preferredEventDateIso
                        ? format(
                            new Date(`${row.preferredEventDateIso}T12:00:00`),
                            "d. MMM yyyy",
                            { locale: nb },
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="px-6 py-4 md:px-8 md:py-5">
                      <span
                        className={cn(
                          "inline-flex rounded-md border-2 px-2.5 py-0.5 text-xs font-semibold md:text-sm",
                          statusBadgeClass(row.status),
                        )}
                      >
                        {INQUIRY_STATUS_LABELS[row.status]}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground md:px-8 md:py-5 tabular-nums">
                      {row.nextFollowUpAtIso
                        ? format(
                            new Date(row.nextFollowUpAtIso),
                            "d. MMM yyyy HH:mm",
                            { locale: nb },
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right md:px-8 md:py-5">
                      <span className="inline-flex w-full items-center justify-end gap-2 tabular-nums">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(row.updatedAtIso), "d. MMM yyyy", {
                            locale: nb,
                          })}
                        </span>
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground/75 transition-colors group-hover:text-rn-text-heading group-hover:opacity-100 opacity-80"
                          aria-hidden
                        />
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </div>

      <InquiryDetailSheet
        inquiry={selected}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelected(null);
        }}
        properties={properties}
        customers={customers}
        canManage={canManageInquiries}
      />
    </div>
  );
}
