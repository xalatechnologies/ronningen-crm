"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { nb } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function toLocalYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date();
  }
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export type DatePickerFieldProps = {
  value: string;
  onChange: (ymd: string) => void;
  /** Inclusive ISO date `yyyy-MM-dd`; days before are disabled */
  minYmd?: string;
  /** Inclusive ISO date `yyyy-MM-dd`; days after are disabled */
  maxYmd?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Match finance toolbar controls (h-11, rounded-xl, border-2) */
  variant?: "toolbar" | "default";
  "aria-invalid"?: boolean;
};

export function DatePickerField({
  value,
  onChange,
  minYmd,
  maxYmd,
  id,
  disabled,
  className,
  variant = "toolbar",
  "aria-invalid": ariaInvalid,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseYmd(value);
  const [viewMonth, setViewMonth] = React.useState(() =>
    startOfMonth(selected),
  );

  React.useEffect(() => {
    setViewMonth(startOfMonth(parseYmd(value)));
  }, [value]);

  const monthStart = startOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const triggerClasses =
    variant === "toolbar"
      ? cn(
          "flex h-11 w-full items-center justify-start gap-2 rounded-xl border-2 border-rn-border-strong bg-card px-4 text-left text-sm font-medium text-foreground shadow-sm outline-none transition-colors",
          "hover:bg-muted/40 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25",
          "disabled:pointer-events-none disabled:opacity-50",
        )
      : cn(
          "flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        id={id}
        disabled={disabled}
        type="button"
        aria-invalid={ariaInvalid}
        className={cn(triggerClasses, className)}
      >
        <CalendarDays
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="tabular-nums">
          {value && /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? format(selected, "d. MMM yyyy", { locale: nb })
            : "Velg dato …"}
        </span>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          className="isolate z-50 outline-none"
          positionMethod="fixed"
          side="bottom"
          sideOffset={6}
          align="start"
          collisionAvoidance={{
            side: "shift",
            align: "shift",
            fallbackAxisSide: "none",
          }}
        >
          <PopoverPrimitive.Popup
            initialFocus={(openType) => openType === "keyboard"}
            className={cn(
              "origin-(--transform-origin) rounded-xl border-2 border-rn-border-strong bg-popover p-3 text-popover-foreground shadow-lg outline-none",
              "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            )}
          >
            <div className="mb-2 flex h-11 items-center justify-between gap-2 px-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-11 shrink-0 rounded-xl border-2 border-rn-border-strong"
                aria-label="Forrige måned"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <span className="min-w-0 truncate px-1 text-center text-sm font-semibold capitalize">
                {format(viewMonth, "LLLL yyyy", { locale: nb })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-11 shrink-0 rounded-xl border-2 border-rn-border-strong"
                aria-label="Neste måned"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {["ma", "ti", "on", "to", "fr", "lø", "sø"].map((d) => (
                <div
                  key={d}
                  className="flex size-11 items-center justify-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const isSelected =
                  Boolean(
                    value &&
                      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
                      isSameDay(day, selected),
                  );
                const isToday = isSameDay(day, new Date());
                const ymd = toLocalYmd(day);
                const outOfRange =
                  (minYmd != null && ymd < minYmd) ||
                  (maxYmd != null && ymd > maxYmd);
                return (
                  <button
                    key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                    type="button"
                    disabled={outOfRange}
                    onClick={() => {
                      if (outOfRange) return;
                      onChange(ymd);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                      outOfRange &&
                        "cursor-not-allowed opacity-25 hover:bg-transparent",
                      !inMonth && !outOfRange && "text-muted-foreground/40",
                      isSelected &&
                        !outOfRange &&
                        "border-2 border-success bg-success text-white shadow-sm",
                      !isSelected &&
                        inMonth &&
                        !outOfRange &&
                        "border-2 border-transparent hover:border-rn-border-strong hover:bg-muted/60",
                      !isSelected &&
                        !inMonth &&
                        !outOfRange &&
                        "border-2 border-transparent hover:bg-muted/40",
                      isToday &&
                        !isSelected &&
                        !outOfRange &&
                        "font-bold text-success ring-1 ring-success/40",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
