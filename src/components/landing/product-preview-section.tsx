import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import {
  PRODUCT_PREVIEW,
  SECTION_TITLES,
} from "@/components/landing/landing-content";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const REPORT_CHART_HEIGHTS = [42, 58, 48, 72, 55, 80, 64] as const;

function BookingsMiniPreview() {
  const rows = [
    { event: "Bryllup", status: "Bekreftet", tone: "bg-success/15 text-success" },
    { event: "Konfirmasjon", status: "Delvis betalt", tone: "bg-amber-500/15 text-amber-900" },
    { event: "Møte", status: "Forespørsel", tone: "bg-rn-surface-segment text-rn-text-slate" },
  ] as const;

  return (
    <div
      className="overflow-hidden rounded-[length:var(--app-radius)] border border-rn-border-strong/70 bg-rn-surface-wash"
      aria-hidden
    >
      {rows.map((row) => (
        <div
          key={row.event}
          className="flex items-center justify-between gap-3 border-b border-rn-border-strong/40 px-3 py-2.5 last:border-b-0"
        >
          <span className="text-sm font-medium text-rn-text-heading">{row.event}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              row.tone,
            )}
          >
            {row.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function FinanceMiniPreview() {
  const kpis = [
    { label: "Inntekt", value: "kr 128k" },
    { label: "Ubetalte", value: "kr 24k" },
    { label: "Margin", value: "62 %" },
  ] as const;

  return (
    <div className="space-y-3" aria-hidden>
      <div className="grid grid-cols-3 gap-2">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[length:var(--app-radius)] border border-rn-border-strong/70 bg-rn-surface-wash px-2 py-2 text-center"
          >
            <p className="text-[10px] font-medium text-rn-text-slate">{kpi.label}</p>
            <p className="mt-0.5 font-heading text-sm font-bold text-rn-text-heading">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-[length:var(--app-radius)] border border-rn-border-strong/70 bg-rn-surface-wash p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-rn-text-slate">
          <span>Betalt denne måneden</span>
          <span className="text-success">78 %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-rn-surface-segment">
          <div className="h-full w-[78%] rounded-full bg-success" />
        </div>
      </div>
    </div>
  );
}

function ReportsMiniPreview() {
  return (
    <div
      className="rounded-[length:var(--app-radius)] border border-rn-border-strong/70 bg-rn-surface-wash p-3"
      aria-hidden
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-rn-text-slate">
        Omsetning YTD
      </p>
      <div className="flex h-20 items-end justify-between gap-1">
        {REPORT_CHART_HEIGHTS.map((height, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 rounded-t-sm",
              index === REPORT_CHART_HEIGHTS.length - 1
                ? "bg-success"
                : "bg-success/25",
            )}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

const MINI_PREVIEWS = [
  BookingsMiniPreview,
  FinanceMiniPreview,
  ReportsMiniPreview,
] as const;

type ProductPreviewItem = (typeof PRODUCT_PREVIEW)[number];

function ProductPreviewCard({
  item,
  index,
  icon: Icon,
}: {
  item: ProductPreviewItem;
  index: number;
  icon: LucideIcon;
}) {
  const isFeatured = index === 1;
  const MiniPreview = MINI_PREVIEWS[index];

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-card shadow-rn-card",
        isFeatured &&
          "lg:-translate-y-2 lg:shadow-rn-hero-success lg:ring-2 lg:ring-success/25",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-4 md:px-6 md:py-5",
          isFeatured
            ? "border-b border-rn-accent-border bg-success text-white"
            : "border-b border-rn-border-strong/50 bg-rn-surface-wash",
        )}
      >
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-[length:var(--app-radius)] border-2",
            isFeatured
              ? "border-white/30 bg-white/10 text-primary-light"
              : "border-rn-border-strong/70 bg-card text-success",
          )}
          aria-hidden
        >
          <Icon className="size-5" />
        </div>
        <h3
          className={cn(
            "font-heading text-xl font-semibold",
            isFeatured ? "text-white" : "text-rn-text-heading",
          )}
        >
          {item.title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5 md:p-6">
        <MiniPreview />

        <ul className="mt-auto space-y-2.5">
          {item.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-2.5 text-sm text-rn-text-slate md:text-base"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function ProductPreviewSection() {
  return (
    <LandingSectionShell
      titleId="landing-preview-title"
      title={SECTION_TITLES.productPreview}
      description="Tre søyler i produktet — med ekte dashboard-følelse, ikke bare punktlister."
      tinted
    >
      <div className="grid gap-5 lg:grid-cols-3 lg:items-center lg:gap-6">
        {PRODUCT_PREVIEW.map((item, index) => (
          <ProductPreviewCard
            key={item.title}
            item={item}
            index={index}
            icon={item.icon}
          />
        ))}
      </div>
    </LandingSectionShell>
  );
}
