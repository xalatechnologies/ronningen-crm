"use client";

import { Check, FileDown, MousePointer2, Users } from "lucide-react";

import type { HeroFilmCopy } from "@/components/landing/hero-film/film-clock";
import { StaffShell } from "@/components/landing/hero-film/staff-shell";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { statusDotClass, statusTextClass } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/client";
import { appNavLabel } from "@/lib/navigation/nav-labels";

function StaticRow({ row, delay }: { row: HeroFilmCopy["sample"]["bookings"][number]; delay: number }) {
  const { t, formatCurrency } = useTranslation();
  const status = row.status === "confirmed" ? "confirmed" : "pending";
  return (
    <div className="film-rise grid grid-cols-12 items-center px-8 py-6" style={{ animationDelay: `${delay}ms` }}>
      <div className="col-span-4 flex items-center gap-4">
        <InitialsAvatar name={row.name} />
        <div>
          <p className="font-heading text-app-lg font-semibold text-foreground">{row.name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-app-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{row.date}</span>
            <span className="font-semibold text-success">{row.audience}</span>
            <span>{row.event}</span>
          </p>
        </div>
      </div>
      <div className="col-span-2 flex items-center gap-2">
        <Users className="size-6 text-muted-foreground" aria-hidden />
        <span className="font-semibold text-foreground">{t("bookings.guestsCount", { count: row.guests })}</span>
      </div>
      <div className="col-span-2 text-right">
        <p className="font-bold tabular-nums text-foreground">{formatCurrency(row.total)}</p>
        <div className="mt-1.5 flex items-center justify-end gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${statusDotClass(row.paid >= 1 ? "success" : "warning")}`} style={{ width: `${row.paid * 100}%` }} />
          </div>
          <span className={`text-app-xs font-bold ${statusTextClass(row.paid >= 1 ? "success" : "warning")}`}>{formatCurrency(row.total * row.paid)}</span>
        </div>
      </div>
      <div className="col-span-2 flex justify-end">
        <BookingStatusBadge status={status} />
      </div>
      <div className="col-span-2 flex justify-end text-app-xs font-bold text-muted-foreground">{row.paid > 0 ? t("contracts.listAccepted") : t("contracts.listNone")}</div>
    </div>
  );
}

/** Bookings list: payment fills in, the contract is approved, and the customer is invited to the portal. */
export function BookingsScene({ sample }: { sample: HeroFilmCopy["sample"] }) {
  const { t, formatCurrency } = useTranslation();
  const th = "text-app-xs font-bold tracking-wide text-muted-foreground uppercase";
  return (
    <StaffShell active="bookings" org={sample.org}>
      <div className="flex h-full flex-col gap-5">
        <h1 className="app-title">{appNavLabel("bookings", t)}</h1>
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
          <div className="grid grid-cols-12 bg-rn-surface-table-head px-8 py-3">
            <div className={`col-span-4 ${th}`}>{t("bookings.tableCustomerEvent")}</div>
            <div className={`col-span-2 ${th}`}>{t("bookings.tableGuests")}</div>
            <div className={`col-span-2 text-right ${th}`}>{t("bookings.tableFinance")}</div>
            <div className={`col-span-2 text-right ${th}`}>{t("bookings.tableStatus")}</div>
            <div className={`col-span-2 text-right ${th}`}>{t("bookings.tableContract")}</div>
          </div>

          <div className="film-rise grid grid-cols-12 items-center px-8 py-6" style={{ animationDelay: "150ms" }}>
            <div className="col-span-4 flex items-center gap-4">
              <InitialsAvatar name={sample.customer} />
              <div>
                <p className="font-heading text-app-lg font-semibold text-foreground">{sample.customer}</p>
                <p className="mt-0.5 flex items-center gap-2 text-app-sm text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">{sample.date}</span>
                  <span className="font-semibold text-success">{sample.audience}</span>
                  <span>{sample.eventType}</span>
                </p>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Users className="size-6 text-muted-foreground" aria-hidden />
              <span className="font-semibold text-foreground">{t("bookings.guestsCount", { count: 120 })}</span>
            </div>
            <div className="col-span-2 text-right">
              <p className="font-bold tabular-nums text-foreground">{formatCurrency(24_500)}</p>
              <div className="mt-1.5 flex items-center justify-end gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div className={`film-grow-x h-full w-1/2 rounded-full ${statusDotClass("warning")}`} style={{ animationDelay: "700ms", animationDuration: "1400ms" }} />
                </div>
                <span className={`film-rise text-app-xs font-bold ${statusTextClass("warning")}`} style={{ animationDelay: "1900ms" }}>
                  {formatCurrency(12_250)}
                </span>
              </div>
            </div>
            <div className="relative col-span-2 flex h-10 items-center justify-end">
              <span className="film-fade-out absolute right-0" style={{ animationDelay: "2600ms" }}>
                <BookingStatusBadge status="pending" />
              </span>
              <span className="film-pop absolute right-0" style={{ animationDelay: "2700ms" }}>
                <BookingStatusBadge status="confirmed" />
              </span>
            </div>
            <div className="col-span-2 flex flex-col items-end gap-2">
              <span className="film-rise flex flex-col items-end" style={{ animationDelay: "3000ms" }}>
                <span className="text-app-xs font-bold text-foreground">{t("contracts.listAccepted")}</span>
                <span className="inline-flex items-center gap-1 text-app-xs font-bold text-foreground">
                  <FileDown className="size-3.5" aria-hidden />
                  {t("contracts.listPdf")}
                </span>
              </span>
              <span className="relative flex h-9 w-full items-center justify-end">
                <span className="film-fade-out absolute right-0 flex flex-col items-end gap-1" style={{ animationDelay: "4500ms" }}>
                  <Button type="button" variant="outline" size="sm" className="film-press" style={{ animationDelay: "4200ms" }} tabIndex={-1}>
                    {t("portal.staff.listInvite")}
                  </Button>
                </span>
                <span className="film-pop absolute right-0 flex items-center gap-1.5 text-app-xs font-semibold text-muted-foreground" style={{ animationDelay: "4600ms" }}>
                  <Check className="size-3.5 text-success" strokeWidth={2.5} aria-hidden />
                  {t("portal.staff.listPending")}
                </span>
                <MousePointer2 className="film-cursor-late pointer-events-none absolute top-5 right-4 size-6 fill-foreground text-card" style={{ animationDelay: "3300ms" }} aria-hidden />
              </span>
            </div>
          </div>
          {sample.bookings.map((row, i) => (
            <StaticRow key={row.name} row={row} delay={450 + i * 140} />
          ))}
        </div>
      </div>
    </StaffShell>
  );
}
