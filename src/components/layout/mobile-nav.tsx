"use client";

import { mainNavigation } from "@/config/navigation";
import { SIDEBAR_SEGMENT_ICONS } from "@/config/nav-icons";
import { RN_TEXT_NAV_LINK } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 px-2 pb-4 md:gap-2.5 md:px-3" aria-label="Mobil hovedmeny">
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
              "flex items-center gap-3.5 rounded-md border-l-[3px] py-3.5 pl-3 pr-3.5 transition-colors outline-none md:gap-4 md:py-4 md:pl-3.5 md:pr-4",
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
                active ? "text-success" : "opacity-85",
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
