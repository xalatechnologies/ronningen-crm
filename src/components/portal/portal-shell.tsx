"use client";

import { CalendarClock, House, ListChecks, LogOut, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";

/** The venue's logo, or the Event Manager mark (as in the venue sidebar) when there is none or it is not an image. */
function VenueMark({ logoUrl }: { logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // The image may already have failed before hydration attached onError.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true);
  }, [logoUrl]);
  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- venue logo, arbitrary host
      <img ref={img} src={logoUrl} alt="" onError={() => setFailed(true)} className="size-9 shrink-0 rounded-xl bg-card object-contain ring-1 ring-foreground/10" />
    );
  }
  return (
    <span className="block size-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-foreground/10 [--brand-tile:#0c1f16] dark:[--brand-tile:#1a4331]">
      <BrandMark />
    </span>
  );
}

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
    { href: "/portal/guests", label: t("portal.nav.guests"), badge: 0, icon: Users },
    { href: "/portal/wishlist", label: t("portal.nav.wishlist"), badge: quotedWishes, icon: ListChecks },
    { href: "/portal/schedule", label: t("portal.nav.schedule"), badge: 0, icon: CalendarClock },
    { href: "/portal/messages", label: t("portal.nav.messages"), badge: unreadMessages, icon: MessageCircle },
  ];

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-foreground/8 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <VenueMark logoUrl={logoUrl} />
            <span className="truncate font-heading text-base font-semibold sm:text-lg">{organizationName}</span>
          </div>
          <Button type="button" variant="ghost" size="sm" className="size-11 shrink-0 rounded-full p-0 sm:w-auto sm:px-3" onClick={() => void logout()} aria-label={t("portal.nav.logout")}>
            <LogOut className="size-5 sm:size-4" aria-hidden />
            <span className="hidden sm:inline">{t("portal.nav.logout")}</span>
          </Button>
        </div>
      </header>
      <nav
        aria-label={organizationName}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-foreground/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:border-b sm:border-t-0 sm:bg-background sm:pb-0"
      >
        <ul className="mx-auto flex w-full max-w-3xl sm:gap-1 sm:px-6 sm:py-2">
          {items.map((item) => {
            const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="min-w-0 flex-1 sm:flex-none">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-semibold leading-tight transition-colors sm:min-h-10 sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:text-[15px]",
                    active
                      ? "text-foreground sm:bg-success/12 sm:text-success"
                      : "text-muted-foreground hover:text-foreground sm:hover:bg-muted/60",
                  )}
                >
                  <span className="relative">
                    <span
                      className={cn(
                        "flex h-8 w-14 items-center justify-center rounded-full transition-colors sm:hidden",
                        active ? "bg-success/15 text-success" : "",
                      )}
                    >
                      <Icon className="size-6" aria-hidden />
                    </span>
                    {item.badge > 0 ? (
                      <span className="absolute right-1 top-0 min-w-4 rounded-full bg-success px-1 text-center text-[10px] leading-4 text-white sm:hidden">
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
