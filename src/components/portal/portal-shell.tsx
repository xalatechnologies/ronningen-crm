"use client";

import { House, ListChecks, LogOut, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";

export function PortalShell({
  organizationName,
  logoUrl,
  unreadMessages,
  quotedWishes,
  children,
}: {
  organizationName: string;
  logoUrl: string | null;
  unreadMessages: number;
  quotedWishes: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const supabase = useSupabase();
  const router = useRouter();
  const items = [
    { href: "/portal", label: t("portal.nav.overview"), badge: 0, icon: House },
    { href: "/portal/wishlist", label: t("portal.nav.wishlist"), badge: quotedWishes, icon: ListChecks },
    { href: "/portal/messages", label: t("portal.nav.messages"), badge: unreadMessages, icon: MessageCircle },
  ];

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-foreground/8 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- venue logo, arbitrary host
              <img src={logoUrl} alt="" className="size-8 rounded-md object-contain" />
            ) : null}
            <span className="font-heading text-lg font-semibold">{organizationName}</span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => void logout()}>
            <LogOut className="size-4" aria-hidden />
            {t("portal.nav.logout")}
          </Button>
        </div>
      </header>
      <nav
        aria-label={organizationName}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-foreground/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:border-b sm:border-t-0 sm:pb-0"
      >
        <ul className="mx-auto flex w-full max-w-3xl sm:gap-1 sm:px-6">
          {items.map((item) => {
            const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1 sm:flex-none">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-app-xs font-semibold transition-colors sm:min-h-11 sm:flex-row sm:gap-2 sm:border-b-2 sm:px-3 sm:text-app-sm",
                    active
                      ? "text-success sm:border-success sm:text-foreground"
                      : "text-muted-foreground hover:text-foreground sm:border-transparent",
                  )}
                >
                  <span className="relative">
                    <Icon className="size-6 sm:hidden" aria-hidden />
                    {item.badge > 0 ? (
                      <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-success px-1 text-center text-[10px] leading-4 text-white sm:hidden">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                  {item.badge > 0 ? (
                    <span className="hidden rounded-full bg-success px-2 py-0.5 text-app-xs text-white sm:inline">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
