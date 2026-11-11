"use client";

import {
  BOOKING_TOTAL,
  PAID_AT_STAGE,
  STAGE_COUNT,
  formatKr,
  type LandingCopy,
  type LandingLocale,
} from "@/components/landing/v2/content";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type StatusKey = "inquiry" | "confirmed" | "partial" | "paid" | "overdue";

const STATUS_CLASS: Record<StatusKey, string> = {
  inquiry: "bg-[#eef1f0] text-[#334155]",
  confirmed: "bg-[#e8f5ee] text-[#1a4331]",
  partial: "bg-[#fff1d0] text-[#6b4300]",
  paid: "bg-[#1a4331] text-white",
  overdue: "bg-[#ffdad6] text-[#93000a]",
};

const STAGE_STATUS: StatusKey[] = ["inquiry", "confirmed", "partial", "paid"];

export function StatusPill({
  status,
  label,
  className,
}: {
  status: StatusKey;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[13px] leading-none font-semibold",
        STATUS_CLASS[status],
        className,
      )}
    >
      {label}
    </span>
  );
}

const PANEL =
  "rounded-[12px] bg-white p-4 text-[#1a1c1a] sm:p-5 ring-1 ring-[#dfe6e2] text-[14px] leading-snug";

/** The live booking card: tap a step, the paid and outstanding amounts follow. */
export function BookingFragment({
  copy,
  locale,
  stage,
  onStage,
  className,
  showHint = true,
}: {
  copy: LandingCopy;
  locale: LandingLocale;
  stage: number;
  onStage: (next: number) => void;
  className?: string;
  showHint?: boolean;
}) {
  const b = copy.booking;
  const paid = PAID_AT_STAGE[stage];
  const outstanding = BOOKING_TOTAL - paid;
  const pct = Math.round((paid / BOOKING_TOTAL) * 100);
  const atEnd = stage === STAGE_COUNT - 1;

  return (
    <div data-ui className={cn(PANEL, "w-full max-w-[480px]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[18px] leading-tight font-bold">
            {b.title} · {b.customer}
          </p>
          <p className="mt-1 text-[14px] text-[#475569]">
            {b.date} · {b.room}
          </p>
        </div>
        <StatusPill
          status={STAGE_STATUS[stage]}
          label={b.stages[stage]}
          className="shrink-0"
        />
      </div>

      <div
        role="group"
        aria-label={b.stages.join(", ")}
        className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4"
      >
        {b.stages.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => onStage(i)}
            aria-pressed={i === stage}
            className={cn(
              "lp-press flex min-h-11 items-center justify-center gap-1 rounded-[8px] px-1 text-[13px] leading-tight font-semibold transition-colors",
              i === stage
                ? "bg-[#1a4331] text-white"
                : i < stage
                  ? "bg-[#e8f5ee] text-[#1a4331]"
                  : "bg-[#f1f4f3] text-[#334155] hover:bg-[#e3eae6]",
            )}
          >
            {i < stage ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
            <span>{name}</span>
          </button>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[8px] bg-[#f6f8f7] p-2.5 sm:p-3">
          <dt className="text-[13px] text-[#475569]">{b.total}</dt>
          <dd className="mt-1 text-[15px] font-bold whitespace-nowrap tabular-nums sm:text-[16px]">
            {formatKr(BOOKING_TOTAL, locale)}
          </dd>
        </div>
        <div className="rounded-[8px] bg-[#f6f8f7] p-2.5 sm:p-3">
          <dt className="text-[13px] text-[#475569]">{b.paid}</dt>
          <dd className="mt-1 text-[15px] font-bold whitespace-nowrap tabular-nums sm:text-[16px] text-[#1a4331]">
            {formatKr(paid, locale)}
          </dd>
        </div>
        <div
          className={cn(
            "rounded-[8px] p-2.5 transition-colors sm:p-3",
            outstanding > 0 ? "bg-[#ffdad6]" : "bg-[#e8f5ee]",
          )}
        >
          <dt className="text-[13px] text-[#475569]">{b.outstanding}</dt>
          <dd
            aria-live="polite"
            className={cn(
              "mt-1 text-[15px] font-bold whitespace-nowrap tabular-nums sm:text-[16px]",
              outstanding > 0 ? "text-[#93000a]" : "text-[#1a4331]",
            )}
          >
            {formatKr(outstanding, locale)}
          </dd>
        </div>
      </dl>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8edeb]"
        role="presentation"
      >
        <div
          className="h-full rounded-full bg-[#1a4331] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {showHint ? (
          <p className="text-[13px] text-[#475569]">{b.hint}</p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => onStage(atEnd ? 0 : stage + 1)}
          className="lp-press min-h-10 shrink-0 rounded-[8px] bg-[#1a4331] px-4 text-[14px] font-semibold text-white hover:bg-[#143528]"
        >
          {atEnd ? b.restart : b.next}
        </button>
      </div>
    </div>
  );
}

const BOOKING_ROWS: { event: string; date: string; room: string; status: StatusKey }[] = [
  { event: "Bryllup · Andersen", date: "14.06", room: "Storsalen", status: "partial" },
  { event: "Konfirmasjon · Berg", date: "22.06", room: "Peisestua", status: "confirmed" },
  { event: "Firmafest · Nordlys AS", date: "05.07", room: "Storsalen", status: "inquiry" },
  { event: "Jubileum · Haugen", date: "19.07", room: "Peisestua", status: "paid" },
];

export function BookingsListFragment({ copy }: { copy: LandingCopy }) {
  const s = copy.fragments.status;
  return (
    <div data-ui className={cn(PANEL, "w-[440px] max-w-full")}>
      <p className="text-[16px] font-bold">{copy.fragments.bookings}</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {BOOKING_ROWS.map((r) => (
          <li
            key={r.event}
            className="flex items-center justify-between gap-3 rounded-[8px] bg-[#f6f8f7] px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.event}</p>
              <p className="text-[13px] text-[#475569]">
                {r.date} · {r.room}
              </p>
            </div>
            <StatusPill status={r.status} label={s[r.status]} className="shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InvoiceFragment({
  copy,
  locale,
}: {
  copy: LandingCopy;
  locale: LandingLocale;
}) {
  const s = copy.fragments.status;
  const rows = [
    { name: "Storsalen, lørdag", amount: 38000 },
    { name: "Catering, 80 gjester", amount: 20800 },
    { name: "Lyd og lys", amount: 3200 },
  ];
  const sum = rows.reduce((a, r) => a + r.amount, 0);
  return (
    <div data-ui className={cn(PANEL, "w-[400px] max-w-full")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-bold">
            {copy.fragments.invoiceNo} 2024-0147
          </p>
          <p className="mt-1 text-[13px] text-[#475569]">
            {copy.fragments.due} 28.06
          </p>
        </div>
        <StatusPill status="overdue" label={s.overdue} />
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.name} className="flex justify-between gap-3">
            <span>{r.name}</span>
            <span className="font-semibold tabular-nums">
              {formatKr(r.amount, locale)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between rounded-[8px] bg-[#e8f5ee] px-3 py-2.5 text-[#1a4331]">
        <span className="font-semibold">{copy.booking.total}</span>
        <span className="text-[16px] font-bold tabular-nums">
          {formatKr(sum, locale)}
        </span>
      </div>
    </div>
  );
}

export function CustomerFragment({
  copy,
  locale,
}: {
  copy: LandingCopy;
  locale: LandingLocale;
}) {
  return (
    <div data-ui className={cn(PANEL, "w-[380px] max-w-full")}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-[#1a4331] text-[15px] font-bold text-white">
          NA
        </span>
        <div>
          <p className="text-[16px] font-bold">Nordlys AS</p>
          <p className="text-[13px] text-[#475569]">post@nordlys.example</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[8px] bg-[#f6f8f7] p-3">
          <dt className="text-[13px] text-[#475569]">
            {copy.fragments.bookings}
          </dt>
          <dd className="mt-1 text-[15px] font-bold whitespace-nowrap tabular-nums sm:text-[16px]">6</dd>
        </div>
        <div className="rounded-[8px] bg-[#f6f8f7] p-3">
          <dt className="text-[13px] text-[#475569]">{copy.booking.total}</dt>
          <dd className="mt-1 text-[15px] font-bold whitespace-nowrap tabular-nums sm:text-[16px]">
            {formatKr(214500, locale)}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-[13px] text-[#475569]">
        {copy.fragments.lastEvent}
      </p>
      <p className="font-semibold">Firmafest · 05.07</p>
    </div>
  );
}

export function PackageFragment({
  copy,
  locale,
}: {
  copy: LandingCopy;
  locale: LandingLocale;
}) {
  const items =
    locale === "en"
      ? ["Main hall, 10 hours", "Sound and lights", "Cleaning"]
      : ["Storsalen, 10 timer", "Lyd og lys", "Rengjøring"];
  return (
    <div data-ui className={cn(PANEL, "w-[380px] max-w-full")}>
      <p className="text-[16px] font-bold">
        {locale === "en" ? "Party package" : "Festpakke"}
      </p>
      <p className="mt-2 text-[28px] leading-none font-bold tracking-tight tabular-nums">
        {formatKr(24500, locale)}
      </p>
      <p className="mt-1 text-[13px] text-[#475569]">{copy.fragments.perEvent}</p>
      <p className="mt-4 text-[13px] font-semibold text-[#475569]">
        {copy.fragments.included}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((i) => (
          <li key={i} className="flex items-center gap-2">
            <Check className="size-4 shrink-0 text-[#1a4331]" aria-hidden />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MONTHLY = [0, 0, 0, 49, 96, 75, 71, 0, 25, 98, 0, 0];

export function ReportFragment({ copy }: { copy: LandingCopy }) {
  const max = Math.max(...MONTHLY);
  return (
    <div data-ui className={cn(PANEL, "w-[440px] max-w-full")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[16px] font-bold">{copy.fragments.monthly}</p>
        <p className="text-[13px] text-[#475569]">
          {copy.fragments.peak}: {max} k
        </p>
      </div>
      <div
        className="mt-4 flex h-36 items-end gap-1.5"
        role="img"
        aria-label={copy.fragments.monthly}
      >
        {MONTHLY.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end">
            <div
              className={cn(
                "rounded-t-[4px]",
                v === max ? "bg-[#1a4331]" : "bg-[#85b098]",
              )}
              style={{ height: `${Math.max((v / max) * 100, v ? 6 : 2)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 text-[13px] text-[#475569]">
        {copy.fragments.months.map((m) => (
          <span key={m} className="flex-1 text-center">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
