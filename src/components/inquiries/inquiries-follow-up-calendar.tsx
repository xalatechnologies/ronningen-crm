"use client";

import type { InquiryListRow } from "@/components/inquiries/types";
import { INQUIRY_STATUS_LABELS } from "@/components/inquiries/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BookingInquiryStatus } from "@/lib/validations";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

const WEEKDAYS_NB = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Lokal kalenderdag (YYYY-MM-DD) for neste oppfølging. */
export function inquiryFollowUpYmd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayCellFillClass(rows: InquiryListRow[]): string {
  if (rows.length === 0) return "";
  const open = rows.filter((r) => r.status !== "converted" && r.status !== "lost");
  if (open.length === 0) {
    if (rows.some((r) => r.status === "converted")) {
      return "bg-emerald-100/85 ring-1 ring-inset ring-emerald-400/35 dark:bg-emerald-950/25 dark:ring-emerald-700/35";
    }
    return "bg-muted/80 ring-1 ring-inset ring-rn-border-strong/35 dark:bg-muted/40";
  }
  if (
    open.some(
      (r) => r.status === "awaiting_customer" || r.status === "quote_sent",
    )
  ) {
    return "bg-amber-100/85 ring-1 ring-inset ring-amber-400/35 dark:bg-amber-950/30 dark:ring-amber-600/40";
  }
  return "bg-emerald-100/85 ring-1 ring-inset ring-emerald-400/35 dark:bg-emerald-950/25 dark:ring-emerald-700/35";
}

function inquiryChipClass(status: BookingInquiryStatus) {
  switch (status) {
    case "converted":
      return "text-emerald-950 hover:bg-white/55 focus-visible:ring-emerald-600/50 dark:text-emerald-100 dark:hover:bg-white/10";
    case "lost":
      return "text-muted-foreground line-through decoration-foreground/40 hover:bg-white/40 dark:hover:bg-white/10";
    case "awaiting_customer":
    case "quote_sent":
      return "text-amber-950 hover:bg-white/55 focus-visible:ring-amber-600/50 dark:text-amber-100 dark:hover:bg-white/10";
    default:
      return "text-rn-text-heading hover:bg-white/50 dark:hover:bg-white/10";
  }
}

function InquiryHoverPreview({
  row,
  hideFooter,
}: {
  row: InquiryListRow;
  hideFooter?: boolean;
}) {
  return (
    <div className="space-y-2 text-left">
      <div>
        <p className="font-heading text-sm font-bold text-rn-text-heading md:text-base">
          {row.customerName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
          {row.propertyName ?? "—"} · {row.eventType}
          {row.festType?.trim() ? ` · ${row.festType.trim()}` : null}
        </p>
      </div>
      <p className="text-xs font-medium text-foreground md:text-sm">
        {INQUIRY_STATUS_LABELS[row.status]}
      </p>
      <div className="space-y-1 border-t border-border pt-2 text-xs md:text-sm">
        {row.nextFollowUpAtIso ? (
          <p className="tabular-nums">
            <span className="font-semibold text-rn-text-body">Oppfølging:</span>{" "}
            {format(new Date(row.nextFollowUpAtIso), "d. MMM yyyy HH:mm", {
              locale: nb,
            })}
          </p>
        ) : null}
        <p>
          <span className="font-semibold text-rn-text-body">Gjester:</span>{" "}
          {row.guestCount}
        </p>
      </div>
      {hideFooter ? null : (
        <p className="text-[10px] leading-snug text-muted-foreground md:text-xs">
          Klikk for å åpne
        </p>
      )}
    </div>
  );
}

function DayInquiriesHoverContent({ rows }: { rows: InquiryListRow[] }) {
  if (rows.length === 0) return null;
  if (rows.length === 1) {
    return <InquiryHoverPreview row={rows[0]} />;
  }
  return (
    <div className="max-h-[min(70vh,22rem)] space-y-0 overflow-y-auto text-left">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">
        {rows.length} forespørsler denne dagen
      </p>
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={cn(i > 0 && "mt-3 border-t border-border pt-3")}
        >
          <InquiryHoverPreview row={row} hideFooter />
        </div>
      ))}
      <p className="mt-3 text-[10px] leading-snug text-muted-foreground md:text-xs">
        Klikk på en rad for å åpne
      </p>
    </div>
  );
}

export function InquiriesFollowUpMonthCalendar({
  rows,
  totalInquiriesCount,
  onSelectInquiry,
}: {
  rows: InquiryListRow[];
  /** Ufiltrert antall (for tom tilstand). */
  totalInquiriesCount: number;
  onSelectInquiry: (row: InquiryListRow) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("nb-NO", {
        month: "long",
        year: "numeric",
      }).format(cursor),
    [cursor],
  );

  const withFollowUp = useMemo(
    () => rows.filter((r) => inquiryFollowUpYmd(r.nextFollowUpAtIso)),
    [rows],
  );

  const rowsInMonth = useMemo(() => {
    const prefix = `${year}-${pad2(monthIndex + 1)}`;
    return withFollowUp.filter((r) => {
      const ymd = inquiryFollowUpYmd(r.nextFollowUpAtIso);
      return ymd?.startsWith(prefix) ?? false;
    });
  }, [withFollowUp, year, monthIndex]);

  const byDay = useMemo(() => {
    const m = new Map<string, InquiryListRow[]>();
    const prefix = `${year}-${pad2(monthIndex + 1)}`;
    const seen = new Map<string, Set<string>>();

    for (const r of rowsInMonth) {
      const ymd = inquiryFollowUpYmd(r.nextFollowUpAtIso);
      if (!ymd?.startsWith(prefix)) continue;
      let ids = seen.get(ymd);
      if (!ids) {
        ids = new Set();
        seen.set(ymd, ids);
      }
      if (ids.has(r.id)) continue;
      ids.add(r.id);
      const list = m.get(ymd) ?? [];
      list.push(r);
      m.set(ymd, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) =>
        a.customerName.localeCompare(b.customerName, "nb"),
      );
    }
    return m;
  }, [rowsInMonth, year, monthIndex]);

  const { daysInMonth, startPad, todayYmd } = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const dim = new Date(year, monthIndex + 1, 0).getDate();
    const start = (first.getDay() + 6) % 7;
    const t = new Date();
    const ty = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
    return { daysInMonth: dim, startPad: start, todayYmd: ty };
  }, [year, monthIndex]);

  function prevMonth() {
    setCursor(new Date(year, monthIndex - 1, 1));
  }

  function nextMonth() {
    setCursor(new Date(year, monthIndex + 1, 1));
  }

  function goToday() {
    const d = new Date();
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  const filteredCount = rows.length;

  const emptyMonthMessage =
    rowsInMonth.length === 0
      ? totalInquiriesCount === 0
        ? "Ingen forespørsler ennå."
        : filteredCount === 0
          ? "Ingen treff med søk eller filter."
          : withFollowUp.length === 0
            ? "Ingen forespørsler i filteret har «neste oppfølging» satt."
            : "Ingen oppfølginger i denne måneden."
      : null;

  const headerCells = WEEKDAYS_NB.map((wd) => (
    <div
      key={wd}
      className="bg-rn-surface-table-head px-1 py-2 text-center text-[10px] font-bold tracking-wider text-rn-text-column uppercase sm:px-2 md:text-xs"
    >
      {wd}
    </div>
  ));

  const dayCells: ReactNode[] = [];

  for (let i = 0; i < startPad; i++) {
    dayCells.push(
      <div
        key={`pad-${i}`}
        className="min-h-[5.5rem] bg-rn-surface-segment/35 sm:min-h-[6.5rem] md:min-h-[7.5rem]"
      />,
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ymd = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
    const dayRows = byDay.get(ymd) ?? [];
    const isToday = ymd === todayYmd;
    const hasRows = dayRows.length > 0;

    const cellClass = cn(
      "flex min-h-[5.5rem] flex-col gap-1 p-1 sm:min-h-[6.5rem] md:min-h-[7.5rem] md:p-1.5",
      hasRows ? dayCellFillClass(dayRows) : "bg-card",
      isToday &&
        cn("ring-2 ring-inset ring-success", !hasRows && "bg-success/5"),
    );

    const dayInner = (
      <>
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold sm:size-7 sm:text-sm md:size-8 md:text-base",
            isToday
              ? "bg-success !text-white shadow-sm [&_svg]:!text-white"
              : hasRows
                ? "bg-white/55 text-rn-text-heading shadow-sm backdrop-blur-[2px] dark:bg-white/10"
                : "text-rn-text-heading",
          )}
        >
          {day}
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-md [-webkit-overflow-scrolling:touch]",
            hasRows && "min-h-[2.25rem] px-0.5 py-0.5",
          )}
        >
          {dayRows.map((r) => (
            <button
              key={r.id}
              type="button"
              className={cn(
                "w-full rounded-md px-1 py-0.5 text-left text-[10px] font-semibold leading-tight transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-0 sm:text-[11px] md:px-1.5 md:py-1 md:text-xs",
                inquiryChipClass(r.status),
                r.status === "lost" && "opacity-80",
              )}
              onClick={() => onSelectInquiry(r)}
              aria-label={`${r.customerName}, ${INQUIRY_STATUS_LABELS[r.status]}`}
            >
              <span className="line-clamp-2">{r.customerName}</span>
            </button>
          ))}
        </div>
      </>
    );

    dayCells.push(
      hasRows ? (
        <PopoverPrimitive.Root key={ymd} modal={false}>
          <PopoverPrimitive.Trigger
            openOnHover
            delay={180}
            closeDelay={220}
            nativeButton={false}
            aria-label={`${dayRows.length} forespørsel${dayRows.length === 1 ? "" : "er"} ${day}. dato`}
            render={(props) => (
              <div
                {...props}
                className={cn(
                  props.className,
                  cellClass,
                  "cursor-default text-left outline-none focus-visible:ring-2 focus-visible:ring-success/40 focus-visible:ring-offset-0",
                )}
              >
                {dayInner}
              </div>
            )}
          />
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner
              className="isolate z-80 outline-none"
              positionMethod="fixed"
              side="top"
              align="center"
              sideOffset={10}
              collisionAvoidance={{
                side: "shift",
                align: "shift",
                fallbackAxisSide: "none",
              }}
            >
              <PopoverPrimitive.Popup
                initialFocus={(openType) => openType === "keyboard"}
                className={cn(
                  "max-w-[min(20rem,calc(100vw-1.5rem))] origin-(--transform-origin) rounded-md border-2 border-rn-border-strong bg-popover p-3 text-popover-foreground shadow-rn-card outline-none",
                  "pointer-events-none select-none",
                  "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                )}
              >
                <DayInquiriesHoverContent rows={dayRows} />
              </PopoverPrimitive.Popup>
            </PopoverPrimitive.Positioner>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      ) : (
        <div key={ymd} className={cellClass}>
          {dayInner}
        </div>
      ),
    );
  }

  const tail = dayCells.length % 7;
  if (tail !== 0) {
    for (let i = 0; i < 7 - tail; i++) {
      dayCells.push(
        <div
          key={`trail-${i}`}
          className="min-h-[5.5rem] bg-rn-surface-segment/35 sm:min-h-[6.5rem] md:min-h-[7.5rem]"
        />,
      );
    }
  }

  return (
    <div className="border-t border-rn-border-strong/35 px-4 py-5 sm:px-6 md:px-8 md:py-6">
      <p className="mb-4 text-xs leading-snug text-muted-foreground sm:text-sm">
        Kalenderen viser <span className="font-medium text-foreground">neste oppfølging</span>{" "}
        per dag (lokal tid). Bruk filter over for å avgrense listen.
      </p>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-xl font-bold capitalize tracking-tight text-rn-text-heading md:text-2xl">
          {monthLabel}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md border-2 border-rn-border-strong px-4 text-sm font-semibold"
            onClick={goToday}
          >
            I dag
          </Button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
              onClick={prevMonth}
              aria-label="Forrige måned"
            >
              <ChevronLeft className="size-[18px]" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
              onClick={nextMonth}
              aria-label="Neste måned"
            >
              <ChevronRight className="size-[18px]" />
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          className="min-w-[280px] overflow-hidden rounded-md border-2 border-rn-border-strong bg-border/80 shadow-sm"
          aria-label={`Oppfølgingskalender, ${monthLabel}`}
        >
          <div className="grid grid-cols-7 gap-px">
            {headerCells}
            {dayCells}
          </div>
        </div>
      </div>

      {emptyMonthMessage ? (
        <p className="mt-5 text-center text-base text-muted-foreground">
          {emptyMonthMessage}
        </p>
      ) : null}
    </div>
  );
}
