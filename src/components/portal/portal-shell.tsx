"use client";

import { CalendarClock, House, ListChecks, LogOut, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BigBloom } from "@/components/brand/botanical";
import { BrandMark } from "@/components/brand/brand-logo";
import { InstallHeaderButton, InstallProvider } from "@/components/pwa/install-provider";
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
    <span className="block size-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-foreground/10 [--brand-tile:#3f1830] dark:[--brand-tile:#8a2c52]">
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

  // Highlight the tapped tab at once instead of waiting for the route to load.
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);
  // Once the route has changed the pending tab is stale (e.g. after browser Back): drop it.
  if (pending && pending.from !== pathname) setPending(null);
  const currentHref =
    items.find((i) => (i.href === "/portal" ? pathname === "/portal" : pathname.startsWith(i.href)))?.href ?? null;
  const activeHref = pending && pending.from === pathname ? pending.to : currentHref;
  const activeIndex = items.findIndex((i) => i.href === activeHref);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <InstallProvider placement="portal">
    <div className="wedding-portal flex min-h-svh flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <BigBloom className="absolute -right-24 top-40 size-80 text-primary/10 sm:-right-16 sm:size-[26rem]" />
        <BigBloom className="absolute -left-28 bottom-24 size-72 rotate-12 text-gold/20 sm:-left-20 sm:size-96" />
      </div>
      <header className="sticky top-0 z-20 border-b border-gold/40 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <VenueMark logoUrl={logoUrl} />
            <span className="truncate font-serif text-base font-semibold sm:text-lg">{organizationName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
          <InstallHeaderButton />
          <Button type="button" variant="ghost" size="sm" className="size-11 shrink-0 rounded-full p-0 sm:w-auto sm:px-3" onClick={() => void logout()} aria-label={t("portal.nav.logout")}>
            <LogOut className="size-5 sm:size-4" aria-hidden />
            <span className="hidden sm:inline">{t("portal.nav.logout")}</span>
          </Button>
          </div>
        </div>
      </header>
      <nav
        aria-label={organizationName}
        className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:static sm:border-b sm:border-gold/40 sm:bg-background sm:p-0"
      >
        <ul className="relative mx-auto flex w-full max-w-md rounded-full bg-card/90 p-1.5 shadow-[0_10px_30px_-8px_rgba(138,44,82,0.35)] ring-1 ring-gold/50 backdrop-blur-xl sm:max-w-3xl sm:gap-1 sm:rounded-none sm:bg-transparent sm:px-6 sm:py-2 sm:shadow-none sm:ring-0 sm:backdrop-blur-none">
          {/* Mobile: one berry pill that glides to the active tab. */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/5)] rounded-full bg-gradient-to-br from-primary to-[#5e1f3d] shadow-md ring-1 ring-gold/60 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.3,0.5,1)] sm:hidden",
              activeIndex < 0 && "opacity-0",
            )}
            style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
          />
          {items.map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <li key={item.href} className="relative min-w-0 flex-1 sm:flex-none">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onPointerDown={() => {
                    router.prefetch(item.href);
                    setPending({ from: pathname, to: item.href });
                  }}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 text-[11px] font-semibold leading-tight transition-colors duration-200 active:scale-95 sm:min-h-10 sm:flex-row sm:gap-2 sm:px-4 sm:text-[15px]",
                    active
                      ? "text-primary-foreground sm:bg-success/12 sm:text-success"
                      : "text-muted-foreground hover:text-foreground sm:hover:bg-muted/60",
                  )}
                >
                  <span className="relative">
                    <Icon className="size-[1.375rem] sm:size-[1.125rem]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                    {item.badge > 0 ? (
                      <span className="absolute -right-2 -top-1.5 min-w-[1.125rem] rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-[1.125rem] text-[#3f1830] ring-2 ring-card sm:hidden">
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
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:py-10">{children}</main>
    </div>
    </InstallProvider>
  );
}
