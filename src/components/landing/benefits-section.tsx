import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import { BENEFITS, SECTION_TITLES } from "@/components/landing/landing-content";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export function BenefitsSection() {
  return (
    <LandingSectionShell
      titleId="landing-benefits-title"
      title={SECTION_TITLES.benefits}
      tinted
    >
      <div
        className={cn(
          RN_CARD_SHELL,
          "w-full bg-card p-6 shadow-rn-card md:p-8",
        )}
      >
        <ul className="grid gap-4 sm:grid-cols-2">
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
    </LandingSectionShell>
  );
}
