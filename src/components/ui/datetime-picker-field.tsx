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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAppDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

const DEFAULT_TIME = "09:00";

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

function parseDatePart(value: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return m?.[1] ?? "";
}

function parseTimePart(value: string): string {
  const m = /T(\d{2}:\d{2})/.exec(value.trim());
  return m?.[1] ?? DEFAULT_TIME;
}

function combineDatetimeLocal(ymd: string, time: string): string {
  if (!ymd) return "";
  const hhmm = /^\d{2}:\d{2}$/.test(time) ? time : DEFAULT_TIME;
  return `${ymd}T${hhmm}`;
}

function parseDatetimeLocal(value: string): Date | null {
  const t = value.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export type DateTimePickerFieldProps = {
  value: string;
  onChange: (datetimeLocal: string) => void;
  /** Inclusive ISO date `yyyy-MM-dd`; days before are disabled */
  minYmd?: string;
  /** Inclusive ISO date `yyyy-MM-dd`; days after are disabled */
  maxYmd?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Match finance toolbar controls (h-11, rounded-md, border-2) */
  variant?: "toolbar" | "default";
  "aria-invalid"?: boolean;
};

export function DateTimePickerField({
  value,
  onChange,
  minYmd,
  maxYmd,
  id,
  disabled,
  className,
  variant = "toolbar",
  "aria-invalid": ariaInvalid,
}: DateTimePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const datePart = parseDatePart(value);
  const timePart = parseTimePart(value);
  const selected = parseYmd(datePart);
  const parsed = parseDatetimeLocal(value);
  const [viewMonth, setViewMonth] = React.useState(() =>
    startOfMonth(parsed ?? new Date()),
  );

  const monthStart = startOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const triggerClasses =
    variant === "toolbar"
      ? cn(
          "flex h-[max(var(--app-input-min-height),var(--app-tap-target-min))] w-full items-center justify-start gap-2 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-card px-4 text-left text-app-control font-medium text-foreground shadow-sm outline-none transition-colors",
          "hover:bg-muted/40 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25",
          "disabled:pointer-events-none disabled:opacity-50",
        )
      : cn(
          "flex h-[max(var(--app-input-min-height),var(--app-tap-target-min))] w-full items-center gap-2 rounded-[length:var(--app-radius)] border border-input bg-background px-3 text-left text-app-control outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        );

  function setDatePart(ymd: string) {
    onChange(combineDatetimeLocal(ymd, datePart ? timePart : DEFAULT_TIME));
  }

  function setTimePart(time: string) {
    if (!datePart) return;
    onChange(combineDatetimeLocal(datePart, time));
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setViewMonth(startOfMonth(parsed ?? new Date()));
        }
      }}
    >
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
          {parsed ? formatAppDateTime(parsed) : "Velg tidspunkt …"}
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
              "origin-(--transform-origin) rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-popover p-3 text-app-control text-popover-foreground shadow-lg outline-none",
              "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            )}
          >
            <div className="mb-2 flex h-11 items-center justify-between gap-2 px-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-11 min-h-[max(2.75rem,var(--app-tap-target-min))] min-w-[max(2.75rem,var(--app-tap-target-min))] shrink-0 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong"
                aria-label="Forrige måned"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <span className="min-w-0 truncate px-1 text-center text-app-control font-semibold capitalize">
                {format(viewMonth, "LLLL yyyy", { locale: nb })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-11 min-h-[max(2.75rem,var(--app-tap-target-min))] min-w-[max(2.75rem,var(--app-tap-target-min))] shrink-0 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong"
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
                  className="flex size-11 items-center justify-center app-meta font-bold tracking-wide text-muted-foreground uppercase"
                >
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const isSelected =
                  Boolean(datePart && isSameDay(day, selected));
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
                      setDatePart(ymd);
                    }}
                    className={cn(
                      "flex size-11 min-h-[max(2.75rem,var(--app-tap-target-min))] min-w-[max(2.75rem,var(--app-tap-target-min))] items-center justify-center rounded-[length:var(--app-radius)] text-app-sm font-medium transition-colors",
                      outOfRange &&
                        "cursor-not-allowed opacity-25 hover:bg-transparent",
                      !inMonth && !outOfRange && "text-muted-foreground/40",
                      isSelected &&
                        !outOfRange &&
                        "border-2 border-success bg-success !text-white shadow-sm [&_svg]:!text-white",
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

            <div className="mt-3 flex flex-col gap-2 border-t border-rn-border-strong/50 pt-3">
              <Label
                htmlFor={id ? `${id}-time` : undefined}
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Klokkeslett
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={id ? `${id}-time` : undefined}
                  type="time"
                  disabled={!datePart}
                  value={datePart ? timePart : ""}
                  onChange={(e) => setTimePart(e.target.value)}
                  className={cn(
                    "h-11 rounded-md border-2 border-rn-border-strong bg-background px-3 text-app-control shadow-sm md:h-12",
                    "focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25",
                    !datePart && "opacity-50",
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!datePart}
                  className="h-11 shrink-0 rounded-md border-2 border-rn-border-strong px-4 text-app-control font-semibold md:h-12"
                  onClick={() => setOpen(false)}
                >
                  Ferdig
                </Button>
              </div>
              {!datePart ? (
                <p className="text-xs text-muted-foreground">
                  Velg dato i kalenderen først.
                </p>
              ) : null}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
