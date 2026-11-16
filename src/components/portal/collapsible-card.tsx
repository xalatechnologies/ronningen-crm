"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A portal card whose body folds away under its heading. Closed, the heading shows a one-line summary instead of
 * the help text, so the page stays short but nothing is lost. The folded body is inert (not focusable, not read
 * out) and the fold animates only for people who have not asked for less motion.
 */
export function CollapsibleCard({
  title,
  help,
  summary,
  step,
  decor,
  badge,
  plain = false,
  defaultOpen = true,
  className,
  children,
}: {
  title: string;
  help?: string;
  summary?: string;
  step?: number;
  decor?: ReactNode;
  /** A small count next to the title, e.g. how many guests are in a group. */
  badge?: string | number;
  /** No card around it: just a heading that folds the list under it (for groups inside a page). */
  plain?: boolean;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const subline = open ? help : summary;

  return (
    <section className={cn("relative", !plain && "overflow-hidden rounded-3xl bg-card shadow-rn-card ring-1 ring-gold/40", className)}>
      {decor}
      <h2 className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-start gap-3 text-left transition-colors",
            plain ? "min-h-11 items-center py-1" : "min-h-16 p-5 hover:bg-muted/30 active:bg-muted/50",
          )}
        >
          {step !== undefined ? (
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/25 font-serif text-base font-semibold text-primary ring-1 ring-gold/50">
              {step}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-2 font-serif text-xl font-semibold leading-tight">
              {title}
              {badge !== undefined ? (
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-sans text-app-xs font-semibold tabular-nums text-muted-foreground">{badge}</span>
              ) : null}
            </span>
            {/* Plain string, not cn(): tailwind-merge reads the custom text-app-sm size as a colour and drops it. */}
            {subline ? <span className={`font-sans text-app-sm font-normal text-muted-foreground${open ? "" : " truncate"}`}>{subline}</span> : null}
          </span>
          <ChevronDown aria-hidden className={cn("mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")} />
        </button>
      </h2>
      <div
        id={bodyId}
        inert={!open}
        className={cn("relative grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={cn("flex flex-col gap-4", plain ? "pt-2" : "px-5 pb-5")}>{children}</div>
        </div>
      </div>
    </section>
  );
}
