"use client";

import { APP_NAME } from "@/config/app";
import { mainNavigation } from "@/config/navigation";
import { SIDEBAR_SEGMENT_ICONS } from "@/config/nav-icons";
import { RN_TEXT_NAV_LINK } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex w-(--sidebar-width) flex-col border-r-2 border-rn-border-strong bg-sidebar text-sidebar-foreground antialiased",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col gap-[length:var(--spacing-app-gap)] px-[length:calc(var(--app-card-padding)*0.45)] pb-[length:calc(var(--app-card-padding)*0.75)] pt-[length:var(--app-card-padding)] md:px-[length:calc(var(--app-card-padding)*0.55)] md:pb-[length:var(--app-card-padding)] md:pt-[length:calc(var(--app-card-padding)+0.25rem)]">
        <div className="flex items-center gap-3.5 md:gap-4">
          <Link
            href="/app/dashboard"
            className={cn(
              "relative flex size-14 shrink-0 overflow-hidden rounded-[length:var(--app-radius)] border-2 border-rn-accent-border bg-black shadow-sm md:size-16",
            )}
            aria-label={`${APP_NAME} — gå til oversikt`}
          >
            <Image
              src="/ronningen-selskapslokale-logo.png"
              alt=""
              fill
              sizes="(min-width: 768px) 64px, 56px"
              className="object-contain p-1.5"
              priority
            />
          </Link>
          <div className="min-w-0">
            <p className="font-heading text-app-base font-bold tracking-tight text-rn-text-heading">
              {APP_NAME}
            </p>
            <p className="text-app-xs font-medium text-rn-text-slate">
              Admin
            </p>
          </div>
        </div>
      </div>
      <nav
        className="flex min-h-0 flex-1 flex-col gap-[length:var(--spacing-app-gap)] px-[length:calc(var(--app-card-padding)*0.35)] pb-[length:var(--app-card-padding)] pt-0 md:gap-[length:var(--spacing-app-gap)] md:px-[length:calc(var(--app-card-padding)*0.45)]"
        aria-label="Hovedmeny"
      >
        {mainNavigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon =
            SIDEBAR_SEGMENT_ICONS[item.segment] ??
            SIDEBAR_SEGMENT_ICONS.dashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[max(2.75rem,var(--app-tap-target-min))] items-center gap-[length:var(--spacing-app-gap)] rounded-[length:var(--app-radius)] border-l-[3px] py-[length:calc(var(--app-card-padding)*0.55)] pl-3 pr-[length:calc(var(--app-card-padding)*0.55)] transition-all outline-none select-none md:gap-[length:var(--spacing-app-gap)] md:py-[length:calc(var(--app-card-padding)*0.65)] md:pl-[length:calc(var(--app-card-padding)*0.45)] md:pr-[length:calc(var(--app-card-padding)*0.65)]",
                RN_TEXT_NAV_LINK,
                "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "border-rn-accent-border bg-rn-surface-gradient-from font-semibold text-success shadow-sm"
                  : "border-transparent font-medium text-rn-text-body hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover hover:text-rn-text-heading",
              )}
            >
              <Icon
                className={cn(
                  "size-7 shrink-0 md:size-8",
                  active ? "text-success opacity-100" : "opacity-85",
                )}
                aria-hidden
              />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
