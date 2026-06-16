import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import {
  BENEFITS,
  LANDING_ROUTES,
  PRICING_DISCLAIMER_DEV,
  PRICING_PLANS,
  PRICING_SECTION_DESCRIPTION,
  SECTION_TITLES,
} from "@/components/landing/landing-content";
import { buttonVariants } from "@/components/ui/button";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const ctaClass = cn(
  buttonVariants({ variant: "success", size: "cta" }),
  "w-full font-heading font-bold",
);

export function BenefitsPricingSection() {
  const showDevDisclaimer = process.env.NODE_ENV === "development";
  const plan = PRICING_PLANS[0];

  return (
    <LandingSectionShell
      id="priser"
      titleId="landing-benefits-pricing-title"
      title={SECTION_TITLES.benefits}
      tinted
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-10">
        <div
          className={cn(
            RN_CARD_SHELL,
            "flex h-full flex-col bg-card p-6 shadow-rn-card md:p-8",
          )}
        >
          <h3 className="font-heading text-lg font-bold tracking-tight text-rn-text-heading md:text-xl">
            Dette får du
          </h3>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-3 text-sm text-rn-text-body md:text-base"
              >
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-success"
                  aria-hidden
                />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <article
          className={cn(
            RN_CARD_SHELL,
            "flex flex-col overflow-hidden bg-card shadow-rn-card",
          )}
        >
          <header className="border-b-2 border-rn-border-strong/50 px-6 py-6 text-center">
            {plan.recommended ? (
              <span className="mb-3 inline-flex rounded-full border border-rn-accent-border bg-success px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase">
                Anbefalt
              </span>
            ) : null}
            <h3 className="font-heading text-xl font-bold tracking-tight text-rn-text-heading md:text-2xl">
              {plan.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-rn-text-slate md:text-base">
              {plan.description}
            </p>

            <p className="mt-3 text-sm leading-relaxed text-rn-text-slate/90 md:text-base">
              {PRICING_SECTION_DESCRIPTION}
            </p>
          </header>

          <div className="flex flex-col items-center gap-2 px-6 py-6">
            <p className="font-heading text-4xl font-bold tracking-tight text-rn-text-heading">
              {plan.price}
              <span className="ml-1 text-base font-semibold text-rn-text-slate">
                NOK/mnd
              </span>
            </p>
            <p className="rounded-full bg-rn-surface-wash px-3 py-1 text-sm font-medium text-rn-text-body">
              30 dagers gratis prøveperiode
            </p>
          </div>

          <footer className="flex flex-col gap-3 border-t-2 border-rn-border-strong/50 bg-rn-surface-wash/50 px-6 py-6">
            <Link href={LANDING_ROUTES.register} className={ctaClass}>
              Start gratis prøveperiode
            </Link>
            {showDevDisclaimer ? (
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                {PRICING_DISCLAIMER_DEV}
              </p>
            ) : null}
          </footer>
        </article>
      </div>
    </LandingSectionShell>
  );
}
