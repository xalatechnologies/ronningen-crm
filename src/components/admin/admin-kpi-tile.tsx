"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export type AdminKpiVariant =
  | "organizations"
  | "subscriptions"
  | "users"
  | "revenue"
  | "support"
  | "audit"
  | "feature-flags"
  | "notifications"
  | "health"
  | "settings";

type AdminKpiTileProps = {
  variant: AdminKpiVariant;
  label: string;
  value: string | number;
  caption?: string;
  icon: LucideIcon;
  iconClassName?: string;
  valueClassName?: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
};

const interactiveBase =
  "group block h-full w-full text-left transition-[color,background-color,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2";

const variantShell: Record<AdminKpiVariant, string> = {
  organizations: cn(
    "relative overflow-hidden rounded-lg bg-muted/20 py-5 pl-5 pr-5 sm:py-6",
    "border border-transparent border-l-[3px] border-l-success/70",
    "hover:bg-muted/35 hover:border-l-success",
  ),
  subscriptions: cn(
    "relative overflow-hidden rounded-lg bg-background py-5 shadow-sm ring-1 ring-rn-border-strong/45 sm:py-6",
    "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-success/80 before:via-emerald-500/50 before:to-transparent",
    "hover:ring-success/30 hover:shadow-md",
  ),
  users: cn(
    "relative overflow-hidden rounded-xl border-0 bg-gradient-to-br from-muted/40 to-muted/15 py-5 sm:py-6",
    "hover:from-muted/50 hover:to-muted/25",
  ),
  revenue: cn(
    "relative overflow-hidden rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] py-5 sm:py-6",
    "hover:border-emerald-500/25 hover:bg-emerald-500/[0.07]",
  ),
  support: cn(
    "flex min-h-full gap-4 rounded-lg border border-rn-border-strong/40 bg-background py-4 pl-0 pr-5 sm:py-5",
    "hover:border-amber-500/25 hover:bg-amber-500/[0.03]",
  ),
  audit: cn(
    "relative overflow-hidden rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-muted/10 py-4 sm:py-5",
    "hover:border-rn-accent-border/50 hover:bg-muted/20",
  ),
  "feature-flags": cn(
    "flex min-h-full overflow-hidden rounded-lg border border-rn-border-strong/40 bg-background shadow-sm",
    "hover:border-success/30 hover:shadow-md",
  ),
  notifications: cn(
    "relative overflow-hidden rounded-2xl bg-background py-5 ring-1 ring-rn-border-strong/50 sm:py-6",
    "hover:ring-success/35",
  ),
  health: cn(
    "relative overflow-hidden rounded-lg border border-rn-border-strong/35 bg-muted/10 py-5 sm:py-6",
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
    "hover:border-rn-border-strong/60 hover:bg-muted/20",
  ),
  settings: cn(
    "rounded-md border-b border-rn-border-strong/50 bg-transparent py-4 sm:py-5",
    "hover:border-success/40 hover:bg-muted/10",
  ),
};

const variantActive: Record<AdminKpiVariant, string> = {
  organizations: "border-l-success bg-success/[0.06] ring-1 ring-success/20",
  subscriptions: "ring-2 ring-success/35 bg-rn-surface-gradient-from/30",
  users: "from-success/10 to-success/[0.03] ring-1 ring-success/25",
  revenue: "border-emerald-500/40 bg-emerald-500/[0.1] ring-1 ring-success/20",
  support: "border-amber-500/35 bg-amber-500/[0.05]",
  audit: "border-rn-accent-border bg-rn-surface-gradient-from/30 shadow-sm",
  "feature-flags": "border-success/40 ring-1 ring-success/25",
  notifications: "ring-2 ring-success/30 bg-rn-surface-gradient-from/20",
  health: "border-success/35 bg-success/[0.05]",
  settings: "border-b-success/50 bg-muted/15",
};

function KpiContent({
  variant,
  label,
  value,
  caption,
  icon: Icon,
  iconClassName,
  valueClassName,
  active,
}: Omit<AdminKpiTileProps, "href" | "onClick">) {
  const valueCn = cn(
    "dashboard-kpi-value",
    valueClassName ?? "text-success dark:!text-white",
  );
  const captionCn = "dashboard-kpi-caption mt-2 text-muted-foreground";

  if (variant === "support") {
    return (
      <>
        <div
          className={cn(
            "flex w-1 shrink-0 self-stretch rounded-l-lg",
            iconClassName ?? "bg-accent",
          )}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
          <div className="mb-2 flex items-center gap-2">
            <Icon className="size-4 shrink-0 text-primary dark:!text-white" aria-hidden />
            <span className="dashboard-kpi-label normal-case tracking-wide">
              {label}
            </span>
          </div>
          <p className={valueCn}>{value}</p>
          {caption ? <p className={captionCn}>{caption}</p> : null}
        </div>
      </>
    );
  }

  if (variant === "feature-flags") {
    return (
      <>
        <div
          className={cn(
            "flex w-14 shrink-0 items-center justify-center self-stretch sm:w-16",
            iconClassName ?? "bg-accent",
          )}
        >
          <Icon className="size-6 text-primary dark:!text-white" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-4 sm:px-5 sm:py-5">
          <span className="dashboard-kpi-label">{label}</span>
          <p className={cn(valueCn, "mt-2")}>{value}</p>
          {caption ? <p className={captionCn}>{caption}</p> : null}
        </div>
      </>
    );
  }

  if (variant === "revenue") {
    return (
      <>
        <Icon
          className={cn(
            "absolute right-4 top-4 size-5 text-emerald-600/25 dark:text-emerald-400/20",
            "transition-opacity group-hover:text-emerald-600/40",
          )}
          aria-hidden
        />
        <div className="relative">
          <p className={cn(valueCn, "text-[calc(28px*var(--app-type-scale))]")}>
            {value}
          </p>
          <p className="mt-2 text-app-sm font-semibold text-foreground">{label}</p>
          {caption ? (
            <p className="mt-1 text-app-sm text-muted-foreground">{caption}</p>
          ) : null}
        </div>
      </>
    );
  }

  if (variant === "users") {
    return (
      <>
        <Icon
          className="pointer-events-none absolute -bottom-2 -right-2 size-20 text-foreground/[0.04]"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              iconClassName ?? "bg-accent",
            )}
          >
            <Icon className="size-5 text-primary dark:!text-white" aria-hidden />
          </div>
          <span className="dashboard-kpi-label">{label}</span>
        </div>
        <div className="relative mt-4">
          <p className={valueCn}>{value}</p>
          {caption ? <p className={captionCn}>{caption}</p> : null}
        </div>
      </>
    );
  }

  if (variant === "audit") {
    return (
      <>
        <div className="mb-2 flex items-center gap-2">
          <span
            className="size-1.5 shrink-0 rounded-full bg-success/70"
            aria-hidden
          />
          <span className="dashboard-kpi-label font-mono text-[0.7rem] tracking-widest">
            {label}
          </span>
        </div>
        <p className={valueCn}>{value}</p>
        {caption ? <p className={captionCn}>{caption}</p> : null}
      </>
    );
  }

  if (variant === "health") {
    return (
      <>
        <div className="mb-3 flex items-center gap-2 border-b border-rn-border-strong/30 pb-3">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              active ? "bg-success animate-pulse" : "bg-muted-foreground/40",
            )}
            aria-hidden
          />
          <span className="dashboard-kpi-label">{label}</span>
          <Icon
            className="ml-auto size-4 text-muted-foreground/70"
            aria-hidden
          />
        </div>
        <p className={valueCn}>{value}</p>
        {caption ? <p className={captionCn}>{caption}</p> : null}
      </>
    );
  }

  if (variant === "settings") {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-app-sm font-semibold text-muted-foreground">
            {label}
          </span>
          <p className={cn(valueCn, "mt-1 text-2xl")}>{value}</p>
          {caption ? (
            <p className="mt-1 text-app-sm text-muted-foreground">{caption}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "rounded-md p-1.5 opacity-70 transition-opacity group-hover:opacity-100",
            iconClassName ?? "bg-muted/50",
          )}
        >
          <Icon className="size-4 text-primary dark:!text-white" aria-hidden />
        </div>
      </div>
    );
  }

  if (variant === "notifications") {
    return (
      <>
        <Icon
          className="mb-3 size-5 text-primary/80 dark:!text-white"
          aria-hidden
        />
        <span className="dashboard-kpi-label">{label}</span>
        <p className={cn(valueCn, "mt-2")}>{value}</p>
        {caption ? <p className={captionCn}>{caption}</p> : null}
      </>
    );
  }

  // organizations, subscriptions — default stacked with icon badge
  const iconOnLeft = variant === "subscriptions";

  return (
    <>
      {iconOnLeft ? (
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              iconClassName ?? "bg-accent",
            )}
          >
            <Icon className="size-4 text-primary dark:!text-white" aria-hidden />
          </div>
          <span className="dashboard-kpi-label">{label}</span>
        </div>
      ) : (
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="dashboard-kpi-label">{label}</span>
          <div
            className={cn(
              "rounded-full p-2 opacity-80",
              iconClassName ?? "bg-accent/80 dark:bg-white/10",
            )}
          >
            <Icon className="size-4 text-primary dark:!text-white" aria-hidden />
          </div>
        </div>
      )}
      <div>
        <p className={valueCn}>{value}</p>
        {caption ? <p className={captionCn}>{caption}</p> : null}
      </div>
    </>
  );
}

export function AdminKpiTile({
  variant,
  label,
  value,
  caption,
  icon,
  iconClassName,
  valueClassName,
  active,
  href,
  onClick,
}: AdminKpiTileProps) {
  const shell = cn(
    variantShell[variant],
    active && variantActive[variant],
    variant === "support" || variant === "feature-flags"
      ? ""
      : "px-5 sm:px-6",
  );

  const content = (
    <KpiContent
      variant={variant}
      label={label}
      value={value}
      caption={caption}
      icon={icon}
      iconClassName={iconClassName}
      valueClassName={valueClassName}
      active={active}
    />
  );

  if (href) {
    return (
      <Link href={href} className={cn(interactiveBase, shell, "group")}>
        {content}
        <span className="sr-only">Gå til {label}</span>
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(interactiveBase, shell, "group")}
        aria-pressed={active ? "true" : "false"}
      >
        {content}
      </button>
    );
  }

  return <div className={shell}>{content}</div>;
}
