"use client";

import { mainNavigation } from "@/config/navigation";
import { SIDEBAR_SEGMENT_ICONS } from "@/config/nav-icons";
import { RN_NAV_LINK_ACTIVE, RN_NAV_LINK_ACTIVE_ICON, RN_TEXT_NAV_LINK } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-[length:var(--spacing-app-gap)] px-[length:calc(var(--app-card-padding)*0.35)] pb-4 md:gap-[length:var(--spacing-app-gap)] md:px-[length:calc(var(--app-card-padding)*0.45)]" aria-label="Mobil hovedmeny">
      {mainNavigation.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon =
          SIDEBAR_SEGMENT_ICONS[item.segment] ?? SIDEBAR_SEGMENT_ICONS.dashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[max(2.75rem,var(--app-tap-target-min))] items-center gap-[length:var(--spacing-app-gap)] rounded-[length:var(--app-radius)] border-l-[3px] py-[length:calc(var(--app-card-padding)*0.55)] pl-3 pr-[length:calc(var(--app-card-padding)*0.55)] transition-colors outline-none md:gap-[length:var(--spacing-app-gap)] md:py-[length:calc(var(--app-card-padding)*0.65)] md:pl-[length:calc(var(--app-card-padding)*0.45)] md:pr-[length:calc(var(--app-card-padding)*0.65)]",
              RN_TEXT_NAV_LINK,
              "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? RN_NAV_LINK_ACTIVE
                : "border-transparent font-medium text-rn-text-body hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover hover:text-rn-text-heading",
            )}
          >
            <Icon
              className={cn(
                "size-7 shrink-0 md:size-8",
                active ? RN_NAV_LINK_ACTIVE_ICON : "opacity-85",
              )}
              aria-hidden
            />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
