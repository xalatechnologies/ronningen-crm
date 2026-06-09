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
import { LANDING_NAV, LANDING_ROUTES } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const loginButtonClass = cn(
  buttonVariants({ variant: "outline" }),
  "hidden h-11 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong px-5 font-heading text-sm font-semibold sm:inline-flex",
);

const registerButtonClass = cn(
  buttonVariants({ variant: "success", size: "default" }),
  "h-11 px-5 font-heading text-sm font-bold",
);

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <Image
              src="/event-manager-logo.png"
              alt=""
              fill
              sizes="(min-width: 768px) 56px, 48px"
              className="object-cover"
              priority
            />
          </span>
          <span className="truncate">{APP_NAME}</span>
        </Link>

        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Hovednavigasjon"
        >
          {LANDING_NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-heading text-base font-semibold text-rn-text-slate transition-colors hover:text-rn-text-heading md:text-lg"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href={LANDING_ROUTES.login} className={loginButtonClass}>
            Logg inn
          </Link>
          <Link href={LANDING_ROUTES.register} className={registerButtonClass}>
            Start gratis
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 md:hidden"
                  aria-label="Åpne meny"
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
                aria-label="Mobilnavigasjon"
              >
                {LANDING_NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-[length:var(--app-radius)] px-3 py-3 text-base font-medium text-rn-text-body hover:bg-rn-surface-row-hover"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t border-rn-border-strong pt-4">
                  <Link
                    href={LANDING_ROUTES.login}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-12 w-full justify-center border-2 border-rn-border-strong font-heading font-semibold",
                    )}
                  >
                    Logg inn
                  </Link>
                  <Link
                    href={LANDING_ROUTES.register}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      buttonVariants({ variant: "success", size: "cta" }),
                      "w-full justify-center",
                    )}
                  >
                    Start gratis prøveperiode
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
