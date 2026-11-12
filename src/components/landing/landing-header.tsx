"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/config/app";
import { LANDING_ROUTES } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import type { User } from "@supabase/supabase-js";
import { ArrowRightIcon, MenuIcon } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AuthProfile } from "@/providers/auth-provider";

const loginButtonClass = cn(
  buttonVariants({ variant: "outline" }),
  "hidden h-10 rounded-full border-0 bg-transparent px-4 font-heading text-[15px] font-semibold text-[#1a1c1a] shadow-none hover:bg-[#eef2f0] sm:inline-flex",
);

const registerButtonClass = cn(
  buttonVariants({ variant: "success", size: "default" }),
  "h-10 rounded-full border-0 px-5 font-heading text-[15px] font-semibold shadow-none",
);

function getDisplayName(
  user: User | null,
  profile: AuthProfile | null,
  fallback: string,
) {
  if (profile?.fullName?.trim()) return profile.fullName.trim();
  const metaName = user?.user_metadata?.full_name;
  if (typeof metaName === "string" && metaName.trim()) return metaName.trim();
  if (user?.email) return user.email;
  return fallback;
}

const NAV_KEYS = [
  { key: "features" as const, hrefKey: "features" as const },
  { key: "howItWorks" as const, hrefKey: "howItWorks" as const },
  { key: "pricing" as const, hrefKey: "pricing" as const },
  { key: "faq" as const, hrefKey: "faq" as const },
];

export function LandingHeader() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, loading, isAuthenticated } = useAuthUser();
  const supabase = useSupabase();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Scroll-spy: the active link is the last nav section whose top has passed the header.
  useEffect(() => {
    const ids = NAV_KEYS.map((item) =>
      t(`landing.navHrefs.${item.hrefKey}`).replace(/^#/, ""),
    );

    function update() {
      const line = window.innerHeight * 0.3;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActiveId(current);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [t]);

  const displayName = useMemo(
    () => getDisplayName(user, profile, t("landing.auth.userFallback")),
    [user, profile, t],
  );

  async function signOut() {
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 bg-card shadow-[0_1px_0_rgba(0,45,28,0.07)]">
      <div
        className={cn(
          LANDING_CONTAINER,
          LANDING_SECTION_X,
          "flex h-16 items-center justify-between gap-4 md:h-[4.5rem]",
        )}
      >
        <Link href="/" aria-label={APP_NAME} className="min-w-0">
          <BrandLockup />
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label={t("landing.header.mainNavAria")}
        >
          {NAV_KEYS.map((item) => {
            const href = t(`landing.navHrefs.${item.hrefKey}`);
            const active = href.replace(/^#/, "") === activeId;
            return (
              <a
                key={item.key}
                href={href}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "rounded-full px-3 py-2 font-heading text-[15px] font-semibold whitespace-nowrap transition-colors lg:px-4",
                  active
                    ? "bg-[#e8f5ee] text-[#1a4331]"
                    : "text-rn-text-slate hover:text-rn-text-heading",
                )}
              >
                {t(`landing.nav.${item.key}`)}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden shrink-0 sm:block [&_[role=radiogroup]>div]:rounded-full [&_[role=radiogroup]>div]:border-0 [&_[role=radiogroup]>div]:bg-[#eef2f0] [&_[role=radio]]:rounded-full">
            <LanguageSwitcher variant="compact" />
          </div>
          {!loading && isAuthenticated ? (
            <Link
              href={LANDING_ROUTES.app}
              title={`${t("landing.auth.loggedInAs")} ${displayName}`}
              className={cn(registerButtonClass, "gap-2.5 pl-1.5 pr-4")}
            >
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-full bg-white/15 text-xs font-bold uppercase"
              >
                {displayName.trim().charAt(0)}
              </span>
              {t("landing.auth.goToApp")}
              <ArrowRightIcon className="size-4" />
            </Link>
          ) : !loading ? (
            <>
              <Link href={LANDING_ROUTES.login} className={loginButtonClass}>
                {t("landing.auth.login")}
              </Link>
              <Link href={LANDING_ROUTES.register} className={registerButtonClass}>
                {t("landing.auth.registerShort")}
              </Link>
            </>
          ) : null}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 md:hidden"
                  aria-label={t("landing.header.openMenuAria")}
                >
                  <MenuIcon className="size-6" />
                </Button>
              }
            />
            <SheetContent
              side="right"
              className="w-[min(100%,300px)] border-rn-border-strong bg-card p-0"
            >
              <SheetHeader className="border-b border-rn-border-strong px-4 py-4 text-left">
                <SheetTitle className="font-heading text-lg font-bold">
                  {APP_NAME}
                </SheetTitle>
              </SheetHeader>
              <nav
                className="flex flex-col gap-1 p-4"
                aria-label={t("landing.header.mobileNavAria")}
              >
                {NAV_KEYS.map((item) => (
                  <a
                    key={item.key}
                    href={t(`landing.navHrefs.${item.hrefKey}`)}
                    onClick={() => setMobileOpen(false)}
                    aria-current={
                      t(`landing.navHrefs.${item.hrefKey}`).replace(/^#/, "") ===
                      activeId
                        ? "location"
                        : undefined
                    }
                    className={cn(
                      "rounded-[length:var(--app-radius)] px-3 py-3 text-base font-medium hover:bg-rn-surface-row-hover",
                      t(`landing.navHrefs.${item.hrefKey}`).replace(/^#/, "") ===
                        activeId
                        ? "bg-[#e8f5ee] font-semibold text-[#1a4331]"
                        : "text-rn-text-body",
                    )}
                  >
                    {t(`landing.nav.${item.key}`)}
                  </a>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t border-rn-border-strong pt-4">
                  <LanguageSwitcher variant="menu" className="px-0" />
                  {!loading && isAuthenticated ? (
                    <>
                      <p className="px-3 py-1 text-sm text-rn-text-slate">
                        {t("landing.auth.loggedInAs")}{" "}
                        <span className="font-semibold text-rn-text-heading">
                          {displayName}
                        </span>
                      </p>
                      <Link
                        href={LANDING_ROUTES.app}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          buttonVariants({ variant: "success", size: "cta" }),
                          "w-full justify-center",
                        )}
                      >
                        {t("landing.auth.goToApp")}
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 w-full justify-center border-2 border-rn-border-strong font-heading font-semibold"
                        onClick={() => void signOut()}
                      >
                        {t("landing.auth.logout")}
                      </Button>
                    </>
                  ) : !loading ? (
                    <>
                      <Link
                        href={LANDING_ROUTES.login}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "h-12 w-full justify-center border-2 border-rn-border-strong font-heading font-semibold",
                        )}
                      >
                        {t("landing.auth.login")}
                      </Link>
                      <Link
                        href={LANDING_ROUTES.register}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          buttonVariants({ variant: "success", size: "cta" }),
                          "w-full justify-center",
                        )}
                      >
                        {t("landing.hero.primaryCta")}
                      </Link>
                    </>
                  ) : null}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
