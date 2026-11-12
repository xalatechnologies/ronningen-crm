"use client";

import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { useMemo } from "react";

// Static copies of the real app screens (same field look as the booking form), not live data.
const fieldClass =
  "flex h-11 w-full items-center rounded-xl border border-foreground/25 bg-background px-4 text-[15px] text-foreground";
const labelClass = "text-[13px] font-semibold text-foreground";

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className={labelClass}>{label}</p>
      <div className={fieldClass}>{value}</div>
    </div>
  );
}

function ScreenTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5 border-b border-foreground/10 pb-4">
      <p className="font-heading text-xl font-semibold text-[#0c1f16]">{title}</p>
      {hint ? <p className="mt-0.5 text-sm text-[#64748b]">{hint}</p> : null}
    </div>
  );
}

function BookingScreen() {
  const { t } = useTranslation();
  return (
    <>
      <ScreenTitle title={t("bookings.new")} hint="Registrer arrangement, kunde og dato." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.fields.name")} value="Familien Andersen" />
        <Field label={t("common.fields.email")} value="familien@eksempel.no" />
        <Field label={t("common.fields.type")} value="Bryllup" />
        <Field label={t("common.fields.date")} value="14. juni" />
      </div>
    </>
  );
}

const PACKAGES = [
  { name: "Bryllupspakke", price: "kr 24 500", detail: "Lokale, lydanlegg, rydding" },
  { name: "Konfirmasjonspakke", price: "kr 16 900", detail: "Lokale, kjøkken" },
  { name: "Møtepakke", price: "kr 6 500", detail: "Lokale, projektor" },
];

function PackageScreen() {
  return (
    <>
      <ScreenTitle title="Velg pakke" />
      <ul className="flex flex-col gap-2.5">
        {PACKAGES.map((p, i) => (
          <li
            key={p.name}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3",
              i === 0 ? "border-[#1a4331] bg-[#e8f5ee]" : "border-foreground/15",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                i === 0 ? "border-[#1a4331] bg-[#1a4331] text-white" : "border-foreground/30",
              )}
            >
              {i === 0 ? <CheckIcon className="size-3" /> : null}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[15px] font-semibold text-[#0c1f16]">{p.name}</span>
              <span className="block truncate text-xs text-[#64748b]">{p.detail}</span>
            </span>
            <span className="font-heading text-[15px] font-bold text-[#1a4331]">{p.price}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function PaymentScreen() {
  const { t } = useTranslation();
  const rows = [
    { label: "Depositum", amount: "kr 10 000", status: "Betalt", paid: true },
    { label: "Restbeløp", amount: "kr 14 500", status: "Forfaller 1. juni", paid: false },
  ];
  return (
    <>
      <ScreenTitle title="Betalinger" />
      <ul className="divide-y divide-foreground/10">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 py-3.5 text-[15px]">
            <span className="min-w-0 flex-1 font-medium text-[#0c1f16]">{r.label}</span>
            <span className="font-semibold tabular-nums">{r.amount}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                r.paid ? "bg-[#e8f5ee] text-[#1a4331]" : "bg-[#fdf3dc] text-[#7a5410]",
              )}
            >
              {r.status}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between rounded-xl bg-[#eef2f0] px-4 py-3">
        <span className="text-sm text-[#475569]">{t("landing.heroStats.outstanding")}</span>
        <span className="font-heading text-lg font-bold text-[#1a4331]">kr 14 500</span>
      </div>
    </>
  );
}

const BARS = [40, 65, 52, 78, 58, 88, 72, 48, 82, 60, 70, 55];

function ReportScreen() {
  const { t, locale } = useTranslation();
  const demo = useMemo(() => getDictionary(locale).landing.heroDemo, [locale]);
  return (
    <>
      <ScreenTitle title={demo.monthlyRevenue} />
      <div className="grid grid-cols-3 gap-2.5">
        {demo.stats.map((s, i) => (
          <div
            key={s.labelKey}
            className={cn("rounded-xl px-3 py-2.5", i === 0 ? "bg-[#1a4331] text-white" : "bg-[#eef2f0]")}
          >
            <p className={cn("text-[11px] font-medium", i === 0 ? "text-[#b9d3c4]" : "text-[#475569]")}>
              {t(`landing.heroStats.${s.labelKey}` as "landing.heroStats.revenue")}
            </p>
            <p className="mt-0.5 font-heading text-[15px] font-bold whitespace-nowrap">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-32 items-end gap-1.5">
        {BARS.map((h, i) => (
          <div
            key={i}
            className={cn("flex-1 rounded-[4px]", i === 5 ? "bg-[#1a4331]" : "bg-[#d3e6da]")}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </>
  );
}

export function HowItWorksPanel({ step }: { step: number }) {
  return (
    <div className="w-full rounded-2xl bg-card p-5 text-[#1a1c1a] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.5)] md:p-7">
      {step === 0 ? <BookingScreen /> : null}
      {step === 1 ? <PackageScreen /> : null}
      {step === 2 ? <PaymentScreen /> : null}
      {step === 3 ? <ReportScreen /> : null}
    </div>
  );
}
