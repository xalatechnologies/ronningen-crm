import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { ScaledScreen } from "@/components/landing/hero-film/scaled-screen";

export const SCREEN_WIDTH = 1100;
export const SCREEN_HEIGHT = 720;

/** A browser window around one scaled screen of the real product. */
export function FilmWindow({ address, demoLabel, children }: { address: string; demoLabel: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-2xl shadow-foreground/10 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3 border-b border-border bg-muted/60 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <i className="size-2.5 rounded-full bg-foreground/15" />
          <i className="size-2.5 rounded-full bg-foreground/15" />
          <i className="size-2.5 rounded-full bg-foreground/15" />
        </span>
        <span className="mx-auto flex min-w-0 max-w-[22rem] flex-1 items-center justify-center gap-1.5 rounded-lg bg-card px-3 py-1 text-[12px] font-medium text-muted-foreground ring-1 ring-foreground/8">
          <Lock className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{address}</span>
        </span>
        <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/10">
          {demoLabel}
        </span>
      </div>
      <ScaledScreen width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
        {children}
      </ScaledScreen>
    </div>
  );
}
