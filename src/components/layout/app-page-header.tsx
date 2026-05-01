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
      <h1 className="font-heading text-3xl font-bold tracking-tight text-rn-text-heading md:text-4xl">
        {title}
      </h1>
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
          "mb-8 flex flex-col overflow-hidden rounded-md border-2 border-rn-border-strong bg-card shadow-rn-card",
          className,
        )}
      >
        <div
          className={cn(
            "flex flex-col justify-between gap-6 md:flex-row md:items-center md:gap-8 xl:gap-8",
            "px-6 sm:px-8 md:px-10 lg:px-12",
            toolbar
              ? "py-6 sm:py-7 md:py-8 lg:py-9"
              : "py-8 sm:py-10 md:py-11 lg:py-12",
          )}
        >
          {titleBlock}
          {actionsBlock}
        </div>
        {toolbar ? (
          <div
            className={cn(
              "border-t border-rn-border-strong/50 px-6 py-5 sm:px-8 sm:py-6 md:px-10 md:py-7 lg:px-12",
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
    <header className={cn("mb-8 flex flex-col gap-4 md:gap-6", className)}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center md:gap-4 xl:gap-5">
        {titleBlock}
        {actionsBlock}
      </div>
      {toolbar ? (
        <div className="border-t border-rn-border-strong/50 pt-4 md:pt-5">
          {toolbar}
        </div>
      ) : null}
    </header>
  );
}
