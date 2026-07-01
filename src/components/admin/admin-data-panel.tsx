import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AdminDataPanel({
  children,
  className,
  title,
  action,
  embedded = false,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        embedded
          ? "min-w-0"
          : cn(
              RN_CARD_SHELL,
              "min-w-0 overflow-hidden p-[length:calc(var(--app-card-padding)*0.35)] sm:p-[length:calc(var(--app-card-padding)*0.5)] md:p-[length:var(--app-card-padding)]",
            ),
        className,
      )}
    >
      {title || action ? (
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            embedded ? "mb-4" : "mb-4",
          )}
        >
          {title ? <h2 className="app-section-title">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}
