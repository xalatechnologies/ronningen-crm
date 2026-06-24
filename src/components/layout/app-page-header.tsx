import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

function normalizeBackLinkLabel(label: string): string {
  return label.replace(/^←\s*/, "").trim();
}

/** Felles topp-seksjon for app-sider (samme mønster som Rapporter). */
export function AppPageHeader({
  title,
  description,
  actions,
  actionsClassName,
  titleClassName,
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
  /** Ekstra klasser på sidetittel (f.eks. customers-partners-hero). */
  titleClassName?: string;
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
      className={cn(
        "admin-inline-link group mb-3 inline-flex w-fit max-w-full items-center gap-1.5 rounded-md border-2 border-rn-border-strong bg-muted/35 px-3 py-1.5 text-app-sm font-semibold text-foreground shadow-sm transition-all",
        "hover:border-success/45 hover:bg-success/10 hover:text-success",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-[length:var(--app-radius)] bg-success/15 text-success transition-colors group-hover:bg-success/25"
        aria-hidden
      >
        <ChevronLeft className="size-4" />
      </span>
      <span className="truncate">{normalizeBackLinkLabel(backLink.label)}</span>
    </Link>
  ) : null;

  const titleBlock = (
    <>
      <h1 className={cn("app-title", titleClassName)}>{title}</h1>
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
