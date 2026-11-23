"use client";

import { Check, Circle } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { contractReadiness } from "@/features/contract-settings/lib/contract-readiness";
import { useTranslation } from "@/i18n/client";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = Parameters<typeof contractReadiness>[0];

/** The checklist that says whether agreements can be sent, and what is missing. */
export function ReadinessCard(props: Props) {
  const { t } = useTranslation();
  const { steps, ready, emailMissing, doneCount } = contractReadiness(props);

  return (
    <section aria-labelledby="contract-readiness-title" className={cn(RN_CARD_SHELL, "flex flex-col gap-4 p-5 md:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="contract-readiness-title" className="font-heading text-lg font-semibold text-foreground">
            {ready ? t("contracts.readiness.readyTitle") : t("contracts.readiness.notReadyTitle")}
          </h2>
          <p className="mt-1 text-app-sm text-muted-foreground">
            {ready ? (emailMissing ? t("contracts.readiness.emailMissingBody") : t("contracts.readiness.readyBody")) : t("contracts.readiness.notReadyBody")}
          </p>
        </div>
        <StatusBadge tone={ready ? "success" : "warning"}>
          {t("contracts.readiness.progress", { done: doneCount, total: steps.length })}
        </StatusBadge>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2.5 text-app-sm">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                step.done ? "bg-status-success-bg text-status-success-text" : "bg-muted text-muted-foreground",
              )}
            >
              {step.done ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
              <span className="sr-only">{step.done ? "✓" : "○"}</span>
            </span>
            <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{t(`contracts.readiness.steps.${step.key}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
