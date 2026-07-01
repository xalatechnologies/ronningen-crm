"use client";

import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { APP_NAME } from "@/config/app";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { AppBrandLogo } from "@/components/brand/app-brand-logo";
import Link from "next/link";

export function AdminSidebar({
  className,
  supportOpenCount = 0,
}: {
  className?: string;
  supportOpenCount?: number;
}) {
  const { t } = useTranslation();
  const copyrightYear = new Date().getFullYear();

  return (
    <aside
      className={cn(
        "admin-sidebar flex w-(--sidebar-width) flex-col border-r-2 border-rn-border-strong bg-sidebar text-sidebar-foreground antialiased",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col gap-[length:var(--spacing-app-gap)] px-[length:calc(var(--app-card-padding)*0.45)] pb-[length:calc(var(--app-card-padding)*0.75)] pt-[length:var(--app-card-padding)] md:px-[length:calc(var(--app-card-padding)*0.55)] md:pb-[length:var(--app-card-padding)] md:pt-[length:calc(var(--app-card-padding)+0.25rem)]">
        <div className="flex items-center gap-3 md:gap-3.5">
          <Link
            href="/admin"
            className="relative flex size-12 shrink-0 overflow-hidden rounded-[length:var(--app-radius)] border-2 border-rn-accent-border bg-black shadow-sm md:size-14"
            aria-label={t("adminNav.overviewAria", { appName: APP_NAME })}
          >
            <AppBrandLogo
              sizes="(min-width: 768px) 56px, 48px"
              priority
            />
          </Link>
          <div className="min-w-0">
            <p className="truncate font-heading text-app-base font-bold tracking-tight text-rn-text-heading">
              {APP_NAME}
            </p>
            <p className="text-app-xs font-medium text-muted-foreground">
              {t("adminNav.platformAdmin")}
            </p>
          </div>
        </div>
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-[length:calc(var(--app-card-padding)*0.35)] pt-0 pb-2 md:px-[length:calc(var(--app-card-padding)*0.45)]"
        aria-label={t("adminNav.menuAria")}
      >
        <AdminNavLinks supportOpenCount={supportOpenCount} />
      </nav>

      <footer className="shrink-0 border-t border-rn-border-strong/50 px-[length:calc(var(--app-card-padding)*0.35)] py-4 md:px-[length:calc(var(--app-card-padding)*0.45)] md:py-5">
        <Link
          href="/app"
          className="text-app-sm font-semibold text-success transition-colors hover:underline"
        >
          ← {t("adminNav.backToApp")}
        </Link>
        <p
          className="mt-2 text-app-xs leading-snug text-muted-foreground"
          suppressHydrationWarning
        >
          © {copyrightYear} {APP_NAME}
        </p>
      </footer>
    </aside>
  );
}

// Re-export for existing imports (e.g. admin-mobile-nav).
export { AdminNavLinks } from "@/components/admin/admin-nav-links";
