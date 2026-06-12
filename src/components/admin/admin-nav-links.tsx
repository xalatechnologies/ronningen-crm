"use client";

import { ADMIN_NAV_ICONS } from "@/config/admin-nav-icons";
import { adminNavigationGroups } from "@/config/admin-routes";
import { RN_TEXT_NAV_LINK } from "@/lib/rn-ui";
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

export function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const hydrated = useHydrated();

  return (
    <>
      {adminNavigationGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="admin-nav-section-label px-2.5 pt-1 pb-0.5 md:px-3">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = hydrated && isActive(pathname, item.href);
            const Icon =
              ADMIN_NAV_ICONS[item.segment] ?? ADMIN_NAV_ICONS.overview;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  navLinkClassName,
                  active
                    ? "border-rn-accent-border bg-rn-surface-gradient-from font-semibold text-success"
                    : "border-transparent font-medium text-rn-text-body hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover hover:text-rn-text-heading",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0 md:size-[1.375rem]",
                    active ? "text-success opacity-100" : "opacity-85",
                  )}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
