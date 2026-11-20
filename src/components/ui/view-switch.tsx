"use client";

import { CalendarDays, List } from "lucide-react";

import { cn } from "@/lib/utils";

export type ViewSwitchValue = "list" | "calendar";

/** List | Calendar switch shared by Reservasjoner and Forespørsler. */
export function ViewSwitch({
  value,
  onChange,
  listLabel,
  calendarLabel,
  ariaLabel,
}: {
  value: ViewSwitchValue;
  onChange: (next: ViewSwitchValue) => void;
  listLabel: string;
  calendarLabel: string;
  ariaLabel: string;
}) {
  const items = [
    { key: "list" as const, label: listLabel, Icon: List },
    { key: "calendar" as const, label: calendarLabel, Icon: CalendarDays },
  ];
  return (
    <div className="inline-flex rounded-xl bg-muted p-1" role="tablist" aria-label={ariaLabel}>
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-app-sm font-semibold transition-colors outline-none select-none md:min-h-12 md:px-6 md:text-app-base",
            "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2",
            value === key ? "bg-success !text-white [&_svg]:!text-white" : "text-rn-text-body hover:bg-card",
          )}
        >
          <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
