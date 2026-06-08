import {
  HERO_DEMO_BOOKINGS,
  HERO_DEMO_STATS,
} from "@/components/landing/landing-content";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

const CHART_HEIGHTS = [40, 65, 52, 78, 58, 88, 72, 48, 82, 60, 70, 55] as const;

export function HeroDashboardPreview() {
  return (
    <div
      className={cn(
        RN_CARD_SHELL,
        "overflow-hidden bg-card p-4 shadow-rn-card md:p-6",
      )}
      aria-hidden
    >
      <div className="mb-4 flex items-center justify-between border-b border-rn-border-strong/50 pb-3">
        <p className="font-heading text-sm font-semibold text-rn-text-heading">
          Dashboard
        </p>
        <span className="rounded-full border border-rn-badge-border bg-rn-badge-surface px-2.5 py-0.5 text-xs font-medium text-rn-text-slate">
          Demo
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {HERO_DEMO_STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[length:var(--app-radius)] border border-rn-border-strong/70 bg-rn-surface-wash px-3 py-3"
          >
            <p className="text-xs font-medium text-rn-text-slate">{stat.label}</p>
            <p className="mt-1 font-heading text-lg font-bold text-rn-text-heading">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[length:var(--app-radius)] border border-rn-border-strong/70 bg-rn-surface-wash p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rn-text-slate">
          Månedlig omsetning
        </p>
        <div className="flex h-28 items-end justify-between gap-1.5">
          {CHART_HEIGHTS.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-sm bg-success/25"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[length:var(--app-radius)] border border-rn-border-strong/70">
        <div className="grid grid-cols-3 gap-2 border-b border-rn-border-strong/70 bg-rn-surface-table-head px-3 py-2 text-xs font-semibold text-rn-text-column">
          <span>Arrangement</span>
          <span>Dato</span>
          <span>Status</span>
        </div>
        {HERO_DEMO_BOOKINGS.map((row) => (
          <div
            key={`${row.event}-${row.date}`}
            className="grid grid-cols-3 gap-2 border-b border-rn-border-strong/40 px-3 py-2.5 text-sm last:border-b-0"
          >
            <span className="font-medium text-rn-text-heading">{row.event}</span>
            <span className="text-rn-text-slate">{row.date}</span>
            <span className="text-rn-text-slate">{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
