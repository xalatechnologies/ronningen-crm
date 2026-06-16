"use client";

import { APP_NAME } from "@/config/app";
import { mainNavigation } from "@/config/navigation";
import { SIDEBAR_SEGMENT_ICONS } from "@/config/nav-icons";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { prefetchTenantRoute } from "@/lib/queries/prefetch-route";
import { getQueryClient } from "@/lib/queries/get-query-client";
import { RN_NAV_LINK_ACTIVE, RN_NAV_LINK_ACTIVE_ICON, RN_TEXT_NAV_LINK } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const { currentOrganization, currentOrganizationId, currentRole } =
    useCurrentOrganization();
  const supabase = useSupabase();
  const displayName = currentOrganization?.name ?? APP_NAME;
  const logoUrl = currentOrganization?.logoUrl;

  useEffect(() => {
    if (!isPending) {
      setPendingHref(null);
    }
  }, [pathname, isPending]);

  const prefetchRoute = useCallback(
    (href: string) => {
      if (!currentOrganizationId || !supabase) return;
      prefetchTenantRoute(
        getQueryClient(),
        supabase,
        currentOrganizationId,
        currentRole,
        href,
      );
    },
    [currentOrganizationId, currentRole, supabase],
  );

  function handleNavClick(href: string) {
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

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
            onMouseEnter={() => prefetchRoute("/app/dashboard")}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={APP_NAME}
                fill
                sizes="(min-width: 768px) 64px, 56px"
                className="object-contain p-1.5"
                priority
              />
            ) : (
              <Image
                src="/event-manager-logo.png"
                alt={APP_NAME}
                fill
                sizes="(min-width: 768px) 64px, 56px"
                className="object-cover"
                priority
              />
            )}
          </Link>
          <div className="min-w-0">
            <p className="font-heading text-app-base font-bold tracking-tight text-rn-text-heading">
              {displayName}
            </p>
            <p className="text-app-xs font-medium text-rn-text-slate">
              {currentOrganization ? APP_NAME : "Administrasjon"}
            </p>
          </div>
        </div>
      </div>
      <nav
        className="flex min-h-0 flex-1 flex-col gap-[length:var(--spacing-app-gap)] overflow-y-auto px-[length:calc(var(--app-card-padding)*0.35)] pt-0 md:gap-[length:var(--spacing-app-gap)] md:px-[length:calc(var(--app-card-padding)*0.45)]"
        aria-label="Hovedmeny"
      >
        {mainNavigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const pending =
            pendingHref === item.href ||
            (isPending && pendingHref === item.href);
          const Icon =
            SIDEBAR_SEGMENT_ICONS[item.segment] ??
            SIDEBAR_SEGMENT_ICONS.dashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => prefetchRoute(item.href)}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  return;
                }
                if (pathname === item.href) {
                  event.preventDefault();
                  return;
                }
                event.preventDefault();
                handleNavClick(item.href);
              }}
              className={cn(
                "flex min-h-[max(2.75rem,var(--app-tap-target-min))] items-center gap-[length:var(--spacing-app-gap)] rounded-[length:var(--app-radius)] border-l-[3px] py-[length:calc(var(--app-card-padding)*0.55)] pl-3 pr-[length:calc(var(--app-card-padding)*0.55)] transition-all outline-none select-none md:gap-[length:var(--spacing-app-gap)] md:py-[length:calc(var(--app-card-padding)*0.65)] md:pl-[length:calc(var(--app-card-padding)*0.45)] md:pr-[length:calc(var(--app-card-padding)*0.65)]",
                RN_TEXT_NAV_LINK,
                "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? RN_NAV_LINK_ACTIVE
                  : "border-transparent font-medium text-rn-text-body hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover hover:text-rn-text-heading",
                pending && !active && "bg-rn-surface-row-hover/80 opacity-80",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "size-7 shrink-0 md:size-8",
                  active ? RN_NAV_LINK_ACTIVE_ICON : "opacity-85",
                  pending && !active && "animate-pulse",
                )}
                aria-hidden
              />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <footer
        className="shrink-0 border-t border-rn-border-strong/50 px-[length:calc(var(--app-card-padding)*0.35)] py-4 md:px-[length:calc(var(--app-card-padding)*0.45)] md:py-5"
      >
        <p className="text-app-xs leading-snug text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </footer>
    </aside>
  );
}
