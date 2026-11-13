"use client";

import { UserRound } from "lucide-react";

import { endTime, type ScheduleEntry } from "@/lib/portal/schedule-rules";
import { cn } from "@/lib/utils";

type Row = Pick<ScheduleEntry, "startTime" | "durationMin" | "title" | "note" | "responsible"> & { id?: string };

/** Vertical timeline, shared by the customer's editor and the venue's read-only view. */
export function ScheduleTimeline({ entries, onSelect }: { entries: readonly Row[]; onSelect?: (index: number) => void }) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const end = endTime(entry.startTime, entry.durationMin);
        const body = (
          <span className="flex flex-col gap-1">
            <span className="break-words text-app-base font-semibold">{entry.title}</span>
            {entry.responsible ? (
              <span className="flex items-center gap-1.5 text-app-sm text-muted-foreground">
                <UserRound className="size-3.5 shrink-0" aria-hidden />
                {entry.responsible}
              </span>
            ) : null}
            {entry.note ? <span className="whitespace-pre-wrap break-words text-app-sm text-muted-foreground">{entry.note}</span> : null}
          </span>
        );
        return (
          <li key={entry.id ?? `${entry.startTime}-${index}`} className="grid grid-cols-[3.25rem_1rem_1fr] gap-x-3">
            <div className="flex flex-col pt-3.5 leading-tight">
              <span className="font-heading text-lg font-bold tabular-nums">{entry.startTime}</span>
              {end ? <span className="text-app-xs tabular-nums text-muted-foreground">– {end}</span> : null}
            </div>
            <div className="relative flex justify-center" aria-hidden>
              <span
                className={cn(
                  "absolute w-px bg-foreground/15",
                  index === 0 ? "top-[1.4rem]" : "top-0",
                  index === entries.length - 1 ? "h-[1.4rem] bg-transparent" : "bottom-0",
                )}
              />
              <span className="relative mt-[1.1rem] size-2.5 rounded-full bg-success ring-4 ring-background" />
            </div>
            <div className="pb-3">
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className="flex min-h-14 w-full flex-col rounded-2xl bg-card px-4 py-3.5 text-left ring-1 ring-foreground/8 transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  {body}
                </button>
              ) : (
                <div className="flex w-full flex-col rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/8">{body}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
