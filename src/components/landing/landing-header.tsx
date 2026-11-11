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
import { MenuIcon } from "lucide-react";
import { AppBrandLogo } from "@/components/brand/app-brand-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AuthProfile } from "@/providers/auth-provider";

const loginButtonClass = cn(
  buttonVariants({ variant: "outline" }),
  "hidden h-11 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong px-5 font-heading text-sm font-semibold sm:inline-flex",
);

const registerButtonClass = cn(
  buttonVariants({ variant: "success", size: "default" }),
  "h-11 px-5 font-heading text-sm font-bold",
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
    <header className="sticky top-0 z-50 border-b-2 border-rn-border-strong/60 bg-card/95 backdrop-blur-sm">
      <div
        className={cn(
          LANDING_CONTAINER,
          LANDING_SECTION_X,
          "flex h-16 items-center justify-between gap-4 md:h-[4.5rem]",
        )}
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 font-heading text-lg font-bold tracking-tight text-rn-text-heading"
        >
          <span className="relative flex size-12 shrink-0 overflow-hidden rounded-[length:var(--app-radius)] border-2 border-rn-accent-border bg-black shadow-sm md:size-14">
            <AppBrandLogo sizes="(min-width: 768px) 56px, 48px" priority />
          </span>
          <span className="truncate">{APP_NAME}</span>
        </Link>

        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label={t("landing.header.mainNavAria")}
        >
          {NAV_KEYS.map((item) => (
            <a
              key={item.key}
              href={t(`landing.navHrefs.${item.hrefKey}`)}
              className="font-heading text-base font-semibold text-rn-text-slate transition-colors hover:text-rn-text-heading md:text-lg"
            >
              {t(`landing.nav.${item.key}`)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher variant="compact" />
          {!loading && isAuthenticated ? (
            <>
              <p className="hidden max-w-[12rem] truncate text-right text-sm text-rn-text-slate md:block lg:max-w-[16rem]">
                {t("landing.auth.loggedInAs")}{" "}
                <span className="font-semibold text-rn-text-heading">
                  {displayName}
                </span>
              </p>
              <Link href={LANDING_ROUTES.app} className={registerButtonClass}>
                {t("landing.auth.goToApp")}
              </Link>
            </>
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
                    className="rounded-[length:var(--app-radius)] px-3 py-3 text-base font-medium text-rn-text-body hover:bg-rn-surface-row-hover"
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
