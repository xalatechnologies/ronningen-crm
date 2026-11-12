"use client";

import { useTranslation } from "@/i18n/client";
import { endTime, type ScheduleEntry } from "@/lib/portal/schedule-rules";
import { cn } from "@/lib/utils";

type Row = Pick<ScheduleEntry, "startTime" | "durationMin" | "title" | "note" | "responsible"> & { id?: string };

/** Vertical timeline, shared by the customer's editor and the venue's read-only view. */
export function ScheduleTimeline({ entries, onSelect }: { entries: readonly Row[]; onSelect?: (index: number) => void }) {
  const { t } = useTranslation();
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const end = endTime(entry.startTime, entry.durationMin);
        const body = (
          <>
            <span className="flex flex-col gap-0.5">
              <span className="break-words font-semibold">{entry.title}</span>
              {entry.durationMin ? (
                <span className="text-app-xs text-muted-foreground">
                  {entry.startTime}–{end} · {t("portal.schedule.minutes", { count: entry.durationMin })}
                </span>
              ) : null}
              {entry.responsible ? <span className="text-app-sm text-muted-foreground">{entry.responsible}</span> : null}
              {entry.note ? <span className="whitespace-pre-wrap break-words text-app-sm text-muted-foreground">{entry.note}</span> : null}
            </span>
          </>
        );
        return (
          <li key={entry.id ?? `${entry.startTime}-${index}`} className="grid grid-cols-[3.75rem_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className="font-heading text-lg font-bold tabular-nums">{entry.startTime}</span>
              <span className={cn("mt-1 w-px flex-1 bg-foreground/15", index === entries.length - 1 && "bg-transparent")} aria-hidden />
            </div>
            <div className="pb-4">
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className="flex min-h-14 w-full flex-col rounded-2xl bg-card p-4 text-left ring-1 ring-foreground/8 transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  {body}
                </button>
              ) : (
                <div className="flex w-full flex-col rounded-2xl bg-card p-4 ring-1 ring-foreground/8">{body}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
