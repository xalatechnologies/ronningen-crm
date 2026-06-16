import { HeroDashboardPreview } from "@/components/landing/hero-dashboard-preview";
import { HERO, LANDING_ROUTES } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const primaryCtaClass = cn(
  buttonVariants({ variant: "success", size: "cta" }),
  "w-full sm:w-auto",
);

const secondaryCtaClass = cn(
  buttonVariants({ variant: "outline", size: "cta" }),
  "w-full border-2 border-rn-border-strong bg-background font-semibold shadow-sm hover:bg-muted sm:w-auto",
);

export function HeroSection() {
  return (
    <section
      aria-labelledby="landing-hero-title"
      className={cn(
        "border-b border-rn-border-strong/40 bg-background py-16 md:py-24",
        LANDING_SECTION_X,
      )}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16",
        )}
      >
        <div className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-4">
            <h1
              id="landing-hero-title"
              className="landing-hero-headline leading-tight tracking-tight"
            >
              {HERO.headline}
            </h1>
            <p className="landing-subhead max-w-2xl leading-relaxed">
              {HERO.subheadline}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={LANDING_ROUTES.register} className={primaryCtaClass}>
              {HERO.primaryCta}
            </Link>
            <a href={HERO.secondaryHref} className={secondaryCtaClass}>
              {HERO.secondaryCta}
            </a>
          </div>

          <p className="text-app-sm text-muted-foreground">{HERO.trust}</p>
        </div>

        <HeroDashboardPreview />
      </div>
    </section>
  );
}
