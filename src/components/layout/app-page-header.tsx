import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

/** Felles topp-seksjon for app-sider (samme mønster som Rapporter). */
export function AppPageHeader({
  title,
  description,
  actions,
  actionsClassName,
  className,
  backLink,
  /** Kort med kant — felles «navbar» øverst på app-sider (Rapporter / Finans-stil). */
  surface = "card",
  compact = false,
  /** Admin-detaljsider: handlinger øverst til høyre, meta kan være høyere. */
  detailLayout = false,
  toolbar,
  toolbarClassName,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Ekstra klasser for actions-kolonnen (f.eks. full bredde + overflow på mobil). */
  actionsClassName?: string;
  className?: string;
  /** Tilbake-lenke øverst inne i header-kortet (admin-detaljsider). */
  backLink?: { href: string; label: string };
  /** `plain` = ingen kort (sjelden; de fleste sider bruker `card`). */
  surface?: "default" | "card";
  /** Kompakt topp-padding (plattformadmin). */
  compact?: boolean;
  detailLayout?: boolean;
  toolbar?: ReactNode;
  /** Ekstra klasser på verktøyraden under border (f.eks. kompakt padding). */
  toolbarClassName?: string;
}) {
  const backLinkBlock = backLink ? (
    <Link
      href={backLink.href}
      className="admin-inline-link mb-2 inline-flex w-fit items-center text-app-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {backLink.label}
    </Link>
  ) : null;

  const titleBlock = (
    <>
      <h1 className="app-title">{title}</h1>
      {description ? (
        <div
          className={cn(
            "admin-page-description max-w-3xl",
            compact ? "mt-2" : "mt-2",
          )}
        >
          {description}
        </div>
      ) : null}
    </>
  );

  const actionsBlock =
    actions ? (
      <div
        className={cn(
          "flex min-w-0 w-full flex-wrap items-center gap-2 md:w-auto md:min-w-0 md:justify-end",
          detailLayout && "md:shrink-0 md:self-start",
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
          "flex max-w-full min-w-0 flex-col overflow-x-hidden overflow-y-visible rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-card shadow-rn-card",
          compact ? "mb-0" : "mb-8",
          className,
        )}
      >
        <div
          className={cn(
            "flex min-w-0 max-w-full flex-col justify-between md:flex-row",
            detailLayout
              ? "gap-4 md:items-start"
              : compact
                ? "gap-3 md:items-center md:gap-4"
                : "gap-[length:var(--spacing-app-section)] md:items-center md:gap-8 xl:gap-8",
            compact
              ? "px-[length:calc(var(--app-card-padding)*0.85)] py-[length:calc(var(--app-card-padding)*0.6)] sm:px-[length:var(--app-card-padding)] sm:py-[length:calc(var(--app-card-padding)*0.7)] md:px-[length:calc(var(--app-card-padding)+0.25rem)] md:py-[length:calc(var(--app-card-padding)*0.8)]"
              : "px-[length:var(--app-card-padding)] sm:px-[length:calc(var(--app-card-padding)+0.25rem)] md:px-[length:calc(var(--app-card-padding)+0.5rem)] lg:px-[length:calc(var(--app-card-padding)+0.75rem)]",
            !compact &&
              (toolbar
                ? "py-[length:calc(var(--app-card-padding)*0.85)] sm:py-[length:calc(var(--app-card-padding)*0.95)] md:py-[length:var(--app-card-padding)] lg:py-[length:calc(var(--app-card-padding)+0.25rem)]"
                : "py-[length:var(--app-card-padding)] sm:py-[length:calc(var(--app-card-padding)+0.35rem)] md:py-[length:calc(var(--app-card-padding)+0.65rem)] lg:py-[length:calc(var(--app-card-padding)+0.85rem)]"),
          )}
        >
          <div className="min-w-0 flex-1">
            {backLinkBlock}
            {titleBlock}
          </div>
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
        <div className="min-w-0">
          {backLinkBlock}
          {titleBlock}
        </div>
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
