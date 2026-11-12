"use client";

import { AdminContextSwitch } from "@/components/layout/admin-context-switch";
import { mainNavigation } from "@/config/navigation";
import { SIDEBAR_SEGMENT_ICONS } from "@/config/nav-icons";
import { RN_TEXT_NAV_LINK } from "@/lib/rn-ui";
import { appNavLabel } from "@/lib/navigation/nav-labels";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <div className="flex flex-col">
      <nav
        className="flex flex-col gap-[length:var(--spacing-app-gap)] px-[length:calc(var(--app-card-padding)*0.35)] pb-4 md:gap-[length:var(--spacing-app-gap)] md:px-[length:calc(var(--app-card-padding)*0.45)]"
        aria-label={t("navigation.mainMenuAria")}
      >
        {mainNavigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon =
            SIDEBAR_SEGMENT_ICONS[item.segment] ?? SIDEBAR_SEGMENT_ICONS.dashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-[max(2.75rem,var(--app-tap-target-min))] items-center gap-[length:var(--spacing-app-gap)] rounded-xl py-[length:calc(var(--app-card-padding)*0.55)] pl-3 pr-[length:calc(var(--app-card-padding)*0.55)] transition-colors outline-none md:gap-[length:var(--spacing-app-gap)] md:py-[length:calc(var(--app-card-padding)*0.65)] md:pl-[length:calc(var(--app-card-padding)*0.45)] md:pr-[length:calc(var(--app-card-padding)*0.65)]",
                RN_TEXT_NAV_LINK,
                "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                active
                  ? "bg-white/15 font-semibold text-white"
                  : "font-medium text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "size-7 shrink-0 md:size-8",
                  active ? "text-white opacity-100" : "opacity-85",
                )}
                aria-hidden
              />
              {appNavLabel(item.segment, t)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-[length:calc(var(--app-card-padding)*0.35)] py-4 md:px-[length:calc(var(--app-card-padding)*0.45)]">
        <AdminContextSwitch active="app" onNavigate={onNavigate} />
      </div>
    </div>
  );
}
