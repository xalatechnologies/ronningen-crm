import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Strukturert meta under tittel på admin-detaljsider. */
export function AdminDetailHeaderMeta({
  lead,
  items,
  badges,
  className,
}: {
  /** F.eks. slug eller e-post — vises som mono-pill. */
  lead?: string;
  items: string[];
  badges?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {lead ? (
        <span className="inline-flex w-fit rounded-md border-2 border-rn-border-strong bg-muted/30 px-2.5 py-0.5 font-mono text-app-xs text-muted-foreground sm:text-app-sm">
          {lead}
        </span>
      ) : null}
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-app-sm text-muted-foreground">
          {items.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      {badges ? (
        <div className="flex flex-wrap items-center gap-2">{badges}</div>
      ) : null}
    </div>
  );
}
