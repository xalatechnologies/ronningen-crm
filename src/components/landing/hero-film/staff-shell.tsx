"use client";

import { Bell, Search } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { AppBrandLogo } from "@/components/brand/app-brand-logo";
import { APP_NAME } from "@/config/app";
import { SIDEBAR_SEGMENT_ICONS } from "@/config/nav-icons";
import { SIDEBAR_ROUTES } from "@/config/routes";
import { useTranslation } from "@/i18n/client";
import { appNavLabel } from "@/lib/navigation/nav-labels";
import { RN_TEXT_NAV_LINK } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

/** The venue app frame (navy sidebar, top bar, canvas) built from the same classes as the real app. */
export function StaffShell({ active, org, children }: { active: string; org: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex h-full bg-background text-foreground antialiased"
      style={{ "--sidebar-width": "232px", "--brand-tile": "var(--rn-text-heading)" } as CSSProperties}
    >
      <aside className="flex w-(--sidebar-width) shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3.5 px-3 pt-5 pb-4">
          <span className="relative flex size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/20">
            <AppBrandLogo />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-app-base leading-tight font-bold tracking-tight text-white">{org}</p>
            <p className="text-app-xs font-medium text-white/65">{APP_NAME}</p>
          </div>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1.5 px-2">
          {SIDEBAR_ROUTES.map((item) => {
            const Icon = SIDEBAR_SEGMENT_ICONS[item.segment] ?? SIDEBAR_SEGMENT_ICONS.dashboard!;
            const isActive = item.segment === active;
            return (
              <span
                key={item.segment}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "sidebar-nav-item flex min-h-11 items-center gap-3 rounded-xl py-2 pr-3 pl-3",
                  RN_TEXT_NAV_LINK,
                  isActive ? "text-white" : "font-medium text-white/80",
                )}
              >
                <Icon className={cn("size-7 shrink-0", isActive ? "opacity-100" : "opacity-85")} aria-hidden />
                {appNavLabel(item.segment, t)}
              </span>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-6">
          <span className="flex w-80 items-center gap-2.5 rounded-xl bg-card px-3.5 py-2.5 text-app-sm text-muted-foreground ring-1 ring-foreground/10">
            <Search className="size-4" aria-hidden />
            {t("common.actions.headerSearchPlaceholder")}
          </span>
          <span className="flex items-center gap-3">
            <span className="relative flex size-10 items-center justify-center rounded-xl bg-card text-muted-foreground ring-1 ring-foreground/10">
              <Bell className="size-[18px]" aria-hidden />
            </span>
            <span className="flex size-10 items-center justify-center rounded-full bg-card text-app-xs font-bold text-success ring-1 ring-foreground/10">
              RS
            </span>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
