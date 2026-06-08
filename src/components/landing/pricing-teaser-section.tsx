import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import {
  LANDING_ROUTES,
  PRICING_DISCLAIMER_DEV,
  PRICING_PLANS,
  SECTION_TITLES,
} from "@/components/landing/landing-content";
import { buttonVariants } from "@/components/ui/button";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";

const ctaClass = cn(
  buttonVariants({ variant: "success", size: "default" }),
  "mt-6 w-full font-heading font-bold",
);

export function PricingTeaserSection() {
  const showDevDisclaimer = process.env.NODE_ENV === "development";

  return (
    <LandingSectionShell
      id="priser"
      titleId="landing-pricing-title"
      title={SECTION_TITLES.pricing}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <article
            key={plan.id}
            className={cn(
              RN_CARD_SHELL,
              "relative flex flex-col bg-card p-6 shadow-rn-card md:p-8",
              plan.recommended && "border-success ring-2 ring-success/20",
            )}
          >
            {plan.recommended ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-rn-accent-border bg-success px-3 py-1 text-xs font-semibold text-white">
                Anbefalt
              </span>
            ) : null}
            <div className="space-y-2">
              <h3 className="font-heading text-xl font-bold text-rn-text-heading">
                {plan.name}
              </h3>
              <p className="text-sm text-rn-text-slate">{plan.description}</p>
            </div>
            <p className="mt-6 font-heading text-3xl font-bold text-rn-text-heading">
              {plan.price}
              <span className="text-base font-medium text-rn-text-slate">
                {" "}
                NOK/mnd
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              30 dagers gratis prøveperiode
            </p>
            <Link href={LANDING_ROUTES.register} className={ctaClass}>
              Start gratis prøveperiode
            </Link>
          </article>
        ))}
      </div>
      {showDevDisclaimer ? (
        <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
          {PRICING_DISCLAIMER_DEV}
        </p>
      ) : null}
    </LandingSectionShell>
  );
}
