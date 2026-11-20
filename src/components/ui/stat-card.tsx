import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Summary card for list and overview pages: optional icon, label, one big value, caption and a free footer.
 * `variant="brand"` is the single highlighted card in a row (brand fill, white text).
 */
export function StatCard({
  icon: Icon,
  label,
  sublabel,
  value,
  caption,
  children,
  variant = "default",
  valueClassName,
  className,
}: {
  icon?: LucideIcon;
  label: ReactNode;
  sublabel?: ReactNode;
  value: ReactNode;
  caption?: ReactNode;
  children?: ReactNode;
  variant?: "default" | "brand";
  /** Overrides the value colour, for example a status text class. */
  valueClassName?: string;
  className?: string;
}) {
  const brand = variant === "brand";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl p-4 lg:p-5",
        brand ? "bg-success text-white" : "bg-card ring-1 ring-foreground/8",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              brand ? "bg-white/15" : "bg-muted text-rn-text-heading",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
          </span>
        ) : null}
        <p className={cn("min-w-0 text-app-sm font-semibold", brand ? "text-white/90" : "text-muted-foreground")}>
          {label}
          {sublabel ? <span className={cn("font-normal", brand ? "text-white/65" : "")}> · {sublabel}</span> : null}
        </p>
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "break-words font-extrabold leading-none tabular-nums",
            brand ? "text-app-3xl font-black tracking-tight" : "text-app-2xl",
          )}
        >
          {brand ? value : <span className={valueClassName ?? "text-rn-text-heading"}>{value}</span>}
        </p>
        {caption ? (
          <p className={cn("mt-3 text-app-xs leading-snug", brand ? "text-white/75" : "text-muted-foreground")}>
            {caption}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
