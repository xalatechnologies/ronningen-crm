"use client";

import { ADMIN_NAV_ICONS } from "@/config/admin-nav-icons";
import { adminNavigationGroups, adminRoutes } from "@/config/admin-routes";
import { useTranslation } from "@/i18n/client";
import { adminNavGroupLabel, adminNavLabel } from "@/lib/navigation/nav-labels";
import { RN_NAV_LINK_ACTIVE, RN_NAV_LINK_ACTIVE_ICON, RN_TEXT_NAV_LINK } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const navLinkClassName = cn(
  "admin-sidebar-link flex min-h-[max(2.5rem,var(--app-tap-target-min))] items-center gap-2.5 rounded-[length:var(--app-radius)] border-l-[3px] py-[length:calc(var(--app-card-padding)*0.45)] pl-2.5 pr-[length:calc(var(--app-card-padding)*0.45)] transition-all outline-none select-none md:gap-3 md:py-[length:calc(var(--app-card-padding)*0.5)] md:pl-3 md:pr-[length:calc(var(--app-card-padding)*0.55)]",
  RN_TEXT_NAV_LINK,
  "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

/** Avoid aria-current mismatches during hydration (pathname extensions / tooling). */
function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

function AdminNavBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);

  return (
    <span
      className="ml-auto flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-none text-white"
      aria-hidden
    >
      {label}
    </span>
  );
}

export function AdminNavLinks({
  onNavigate,
  supportOpenCount = 0,
}: {
  onNavigate?: () => void;
  supportOpenCount?: number;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const hydrated = useHydrated();

  return (
    <>
      {adminNavigationGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="admin-nav-section-label px-2.5 pt-1 pb-0.5 md:px-3">
            {adminNavGroupLabel(group.label, t)}
          </p>
          {group.items.map((item) => {
            const active = hydrated && isActive(pathname, item.href);
            const Icon =
              ADMIN_NAV_ICONS[item.segment] ?? ADMIN_NAV_ICONS.overview;
            const isSupport = item.href === adminRoutes.support;
            const badgeCount =
              isSupport && active ? 0 : isSupport ? supportOpenCount : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  navLinkClassName,
                  active
                    ? RN_NAV_LINK_ACTIVE
                    : "border-transparent font-medium text-rn-text-body hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover hover:text-rn-text-heading",
                )}
                aria-current={active ? "page" : undefined}
                aria-label={
                  badgeCount > 0
                    ? t("adminNav.openTicketsAria", { count: badgeCount })
                    : undefined
                }
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0 md:size-[1.375rem]",
                    active ? RN_NAV_LINK_ACTIVE_ICON : "opacity-85",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{adminNavLabel(item.segment, t)}</span>
                <AdminNavBadge count={badgeCount} />
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
