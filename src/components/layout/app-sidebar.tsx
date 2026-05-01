"use client";

import { APP_NAME } from "@/config/app";
import { mainNavigation } from "@/config/navigation";
import { SIDEBAR_SEGMENT_ICONS } from "@/config/nav-icons";
import { cn } from "@/lib/utils";
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
      <div className="px-4 pb-7 pt-7 md:px-5 md:pb-8 md:pt-8">
        <div className="flex items-center gap-3.5 md:gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-rn-accent-border bg-success font-heading text-lg font-bold text-primary-light shadow-sm md:size-16 md:text-xl"
            aria-hidden
          >
            R
          </div>
          <div className="min-w-0">
            <p className="font-heading text-lg font-bold tracking-tight text-rn-text-heading md:text-xl">
              {APP_NAME}
            </p>
            <p className="text-sm font-medium text-rn-text-slate md:text-base">
              Admin
            </p>
          </div>
        </div>
      </div>
      <nav
        className="flex flex-1 flex-col gap-2 px-2 py-4 pb-8 md:gap-2.5 md:px-3"
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
                "flex items-center gap-3.5 rounded-r-xl border-l-[3px] py-3.5 pl-3 pr-3.5 font-heading text-base leading-snug transition-all outline-none select-none md:gap-4 md:py-4 md:pl-3.5 md:pr-4 md:text-lg",
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
