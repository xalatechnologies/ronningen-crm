"use client";

import { statusDotClass, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export type SegmentedFilterOption<K extends string> = {
  key: K;
  label: string;
  count?: number;
  /** Shows a small status dot in the tone's colour. */
  tone?: StatusTone;
};

/** One grey bar with a white selected segment. Shared by list pages for status filters. */
export function SegmentedFilter<K extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly SegmentedFilterOption<K>[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-full overflow-x-auto", className)}>
      <div className="inline-flex gap-1 rounded-xl bg-muted p-1" role="group" aria-label={ariaLabel}>
        {options.map((option) => {
          const active = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.key)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-success/40",
                active
                  ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.tone ? <span className={cn("size-2 rounded-full", statusDotClass(option.tone))} aria-hidden /> : null}
              <span className="text-app-sm font-semibold">{option.label}</span>
              {option.count != null ? (
                <span className="list-filter-count text-app-xs font-bold tabular-nums opacity-70">
                  {option.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
