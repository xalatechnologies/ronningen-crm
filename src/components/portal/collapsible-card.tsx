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
  defaultOpen = true,
  className,
  children,
}: {
  title: string;
  help?: string;
  summary?: string;
  step?: number;
  decor?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const subline = open ? help : summary;

  return (
    <section className={cn("relative overflow-hidden rounded-3xl bg-card shadow-rn-card ring-1 ring-gold/40", className)}>
      {decor}
      <h2 className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-16 w-full items-start gap-3 p-5 text-left transition-colors hover:bg-muted/30 active:bg-muted/50"
        >
          {step !== undefined ? (
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/25 font-serif text-base font-semibold text-primary ring-1 ring-gold/50">
              {step}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-serif text-xl font-semibold leading-tight">{title}</span>
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
          <div className="flex flex-col gap-4 px-5 pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
