"use client";

import { Check, MousePointer2, Users } from "lucide-react";

import type { HeroFilmCopy } from "@/components/landing/hero-film/film-clock";
import { StaffShell } from "@/components/landing/hero-film/staff-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useTranslation } from "@/i18n/client";

function Row({ name, meta, guests, status, tone }: { name: string; meta: string; guests: number; status: string; tone: "info" | "neutral" }) {
  const { t, formatCurrency } = useTranslation();
  return (
    <div className="grid grid-cols-12 items-center px-8 py-5">
      <div className="col-span-5 flex items-center gap-4">
        <InitialsAvatar name={name} />
        <div>
          <p className="font-heading text-app-lg font-semibold text-foreground">{name}</p>
          <p className="mt-0.5 text-app-sm text-muted-foreground">{meta}</p>
        </div>
      </div>
      <div className="col-span-2 flex items-center gap-2">
        <Users className="size-6 text-muted-foreground" aria-hidden />
        <span className="font-semibold text-foreground">{t("bookings.guestsCount", { count: guests })}</span>
      </div>
      <div className="col-span-2 text-right font-bold tabular-nums text-foreground">{formatCurrency(24_500)}</div>
      <div className="col-span-3 flex justify-end">
        <StatusBadge size="lg" tone={tone}>
          {status}
        </StatusBadge>
      </div>
    </div>
  );
}

/** Inquiries page: one inquiry is converted to a booking with one click. */
export function InquiryScene({ sample }: { sample: HeroFilmCopy["sample"] }) {
  const { t, formatCurrency } = useTranslation();
  return (
    <StaffShell active="inquiries" org={sample.org}>
      <div className="flex h-full flex-col gap-5">
        <h1 className="app-title">{t("inquiries.title")}</h1>
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
          <div className="grid grid-cols-12 bg-rn-surface-table-head px-8 py-3 text-app-xs font-bold tracking-wide text-muted-foreground uppercase">
            <div className="col-span-5">{t("inquiries.tableCustomer")}</div>
            <div className="col-span-2">{t("bookings.tableGuests")}</div>
            <div className="col-span-2 text-right">{t("bookings.tableFinance")}</div>
            <div className="col-span-3 text-right">{t("bookings.tableStatus")}</div>
          </div>

          <div className="divide-y divide-foreground/6">
            <div className="film-rise relative grid grid-cols-12 items-center bg-success/5 px-8 py-5" style={{ animationDelay: "150ms" }}>
              <div className="col-span-5 flex items-center gap-4">
                <InitialsAvatar name={sample.customer} />
                <div>
                  <p className="font-heading text-app-lg font-semibold text-foreground">{sample.customer}</p>
                  <p className="mt-0.5 text-app-sm text-muted-foreground">
                    {sample.fullDate} · {sample.audience} · {sample.eventType}
                  </p>
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Users className="size-6 text-muted-foreground" aria-hidden />
                <span className="font-semibold text-foreground">{t("bookings.guestsCount", { count: 120 })}</span>
              </div>
              <div className="col-span-2 text-right font-bold tabular-nums text-foreground">{formatCurrency(24_500)}</div>
              <div className="relative col-span-3 flex h-10 items-center justify-end">
                <span className="film-fade-out absolute right-0" style={{ animationDelay: "3200ms" }}>
                  <StatusBadge size="lg" tone="info">
                    {sample.inquiryNew}
                  </StatusBadge>
                </span>
                <span className="film-pop absolute right-0" style={{ animationDelay: "3300ms" }}>
                  <StatusBadge size="lg" tone="success">
                    {sample.inquiryConverted}
                  </StatusBadge>
                </span>
              </div>
            </div>
            {sample.others.map((row, i) => (
              <div key={row.name} className="film-rise" style={{ animationDelay: `${300 + i * 120}ms` }}>
                <Row name={row.name} meta={`${row.event} · ${sample.audience}`} guests={i === 0 ? 60 : 12} status={row.status} tone={row.status === sample.inquiryNew ? "info" : "neutral"} />
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex h-14 items-center">
          <span
            className="film-fade-out absolute left-0 inline-flex h-12 items-center rounded-xl bg-success px-6 text-app-base font-semibold text-white"
            style={{ animationDelay: "3200ms" }}
          >
            <span className="film-press inline-flex" style={{ animationDelay: "2900ms" }}>
              {t("inquiries.convertToBooking")}
            </span>
          </span>
          <span className="film-pop absolute left-0 inline-flex h-12 items-center gap-2.5 rounded-xl bg-status-success-bg px-5 text-app-base font-semibold text-status-success-text" style={{ animationDelay: "3350ms" }}>
            <Check className="size-5" strokeWidth={2.5} aria-hidden />
            {sample.created}
          </span>
          <MousePointer2 className="film-cursor pointer-events-none absolute top-8 left-24 size-7 fill-foreground text-card" style={{ animationDelay: "900ms" }} aria-hidden />
        </div>
      </div>
    </StaffShell>
  );
}
