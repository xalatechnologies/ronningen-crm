import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Felles topp-seksjon for app-sider (samme mønster som Rapporter). */
export function AppPageHeader({
  title,
  actions,
  actionsClassName,
  className,
  /** Kort med kant — felles «navbar» øverst på app-sider (Rapporter / Finans-stil). */
  surface = "card",
  /** Ekstra rad under tittel (f.eks. filtre) — samme kort når `surface="card"`. */
  toolbar,
  toolbarClassName,
}: {
  title: string;
  actions?: ReactNode;
  /** Ekstra klasser for actions-kolonnen (f.eks. full bredde + overflow på mobil). */
  actionsClassName?: string;
  className?: string;
  /** `plain` = ingen kort (sjelden; de fleste sider bruker `card`). */
  surface?: "default" | "card";
  toolbar?: ReactNode;
  /** Ekstra klasser på verktøyraden under border (f.eks. kompakt padding). */
  toolbarClassName?: string;
}) {
  const titleBlock = (
    <div className="min-w-0 shrink-0">
      <h1 className="app-title">{title}</h1>
    </div>
  );

  const actionsBlock =
    actions ? (
      <div
        className={cn(
          "flex min-w-0 w-full flex-1 flex-wrap items-center gap-2 md:w-auto md:min-w-0 md:justify-end",
          actionsClassName,
        )}
      >
        {actions}
      </div>
    ) : null;

  if (surface === "card") {
    return (
      <header
        className={cn(
          "mb-8 flex max-w-full min-w-0 flex-col overflow-x-hidden overflow-y-visible rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-card shadow-rn-card",
          className,
        )}
      >
        <div
          className={cn(
            "flex min-w-0 max-w-full flex-col justify-between gap-[length:var(--spacing-app-section)] md:flex-row md:items-center md:gap-8 xl:gap-8",
            "px-[length:var(--app-card-padding)] sm:px-[length:calc(var(--app-card-padding)+0.25rem)] md:px-[length:calc(var(--app-card-padding)+0.5rem)] lg:px-[length:calc(var(--app-card-padding)+0.75rem)]",
            toolbar
              ? "py-[length:calc(var(--app-card-padding)*0.85)] sm:py-[length:calc(var(--app-card-padding)*0.95)] md:py-[length:var(--app-card-padding)] lg:py-[length:calc(var(--app-card-padding)+0.25rem)]"
              : "py-[length:var(--app-card-padding)] sm:py-[length:calc(var(--app-card-padding)+0.35rem)] md:py-[length:calc(var(--app-card-padding)+0.65rem)] lg:py-[length:calc(var(--app-card-padding)+0.85rem)]",
          )}
        >
          {titleBlock}
          {actionsBlock}
        </div>
        {toolbar ? (
          <div
            className={cn(
              "min-w-0 max-w-full overflow-x-auto border-t border-rn-border-strong/50 px-[length:var(--app-card-padding)] py-[length:calc(var(--app-card-padding)*0.75)] sm:px-[length:calc(var(--app-card-padding)+0.25rem)] sm:py-[length:calc(var(--app-card-padding)*0.85)] md:px-[length:calc(var(--app-card-padding)+0.5rem)] md:py-[length:calc(var(--app-card-padding)*0.9)] lg:px-[length:calc(var(--app-card-padding)+0.75rem)]",
              toolbarClassName,
            )}
          >
            {toolbar}
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header
      className={cn(
        "mb-8 flex max-w-full min-w-0 flex-col gap-[length:var(--spacing-app-gap)] md:gap-[length:var(--spacing-app-section)]",
        className,
      )}
    >
      <div className="flex min-w-0 max-w-full flex-col justify-between gap-4 md:flex-row md:items-center md:gap-4 xl:gap-5">
        {titleBlock}
        {actionsBlock}
      </div>
      {toolbar ? (
        <div className="min-w-0 max-w-full overflow-x-auto border-t border-rn-border-strong/50 pt-4 md:pt-5">
          {toolbar}
        </div>
      ) : null}
    </header>
  );
}
