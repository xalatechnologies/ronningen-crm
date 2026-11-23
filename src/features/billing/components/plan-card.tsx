"use client";

import { Check } from "lucide-react";

import { billingPlanFeatureLabel, type BillingPlan } from "@/config/billing-plans";
import { useTranslation } from "@/i18n/client";
import { SAAS_MONTHLY_PRICE_NOK, SAAS_TRIAL_DAYS } from "@/lib/billing/constants";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

/** What the plan costs and what it includes. */
export function PlanCard({ plan }: { plan: BillingPlan }) {
  const { t, formatCurrency } = useTranslation();

  return (
    <aside className={cn(RN_CARD_SHELL, "flex flex-col gap-5 p-5 md:p-6")}>
      <div>
        <p className="text-app-xs font-semibold text-muted-foreground">{t("billing.includedInPlan")}</p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">{plan.name}</h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
          {formatCurrency(SAAS_MONTHLY_PRICE_NOK)}
          <span className="text-base font-medium text-muted-foreground">{t("billing.perMonth")}</span>
        </p>
        <p className="mt-2 text-app-sm leading-relaxed text-muted-foreground">
          {t("billing.trialNote", { days: SAAS_TRIAL_DAYS })}
        </p>
      </div>
      <ul className="flex flex-col gap-2 border-t border-foreground/10 pt-5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-app-sm text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            {billingPlanFeatureLabel(feature, t)}
          </li>
        ))}
      </ul>
    </aside>
  );
}
