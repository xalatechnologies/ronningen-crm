"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { buildSetupChecklist, type SetupChecklist } from "@/features/setup-checklist/lib/setup-checklist";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSetupFactsQuery } from "@/hooks/use-tenant-page-queries";
import { useTranslation } from "@/i18n/client";
import { isBillingEnabled } from "@/lib/billing/constants";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

/** The checklist itself: percent, a bar, and every step with what is done and what is left. */
export function SetupChecklistView({ checklist }: { checklist: SetupChecklist }) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="setup-checklist-title" className={cn(RN_CARD_SHELL, "p-6 md:p-8")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 id="setup-checklist-title" className="font-heading text-app-xl font-bold tracking-tight text-foreground">
            {t("dashboard.setup.title")}
          </h2>
          <p className="text-app-base text-muted-foreground">{t("dashboard.setup.subtitle")}</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-app-3xl leading-none font-bold tabular-nums text-foreground">
            {t("dashboard.setup.percentDone", { percent: checklist.percent })}
          </p>
          <p className="mt-1.5 text-app-sm text-muted-foreground">
            {t("dashboard.setup.stepsDone", { done: checklist.doneCount, total: checklist.total })}
          </p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={t("dashboard.setup.progressLabel")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={checklist.percent}
        className="mt-5 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${checklist.percent}%` }} />
      </div>

      <ol className="mt-6 grid gap-3 lg:grid-cols-2">
        {checklist.steps.map((step) => {
          const isNext = step.id === checklist.nextId;
          return (
            <li
              key={step.id}
              aria-current={isNext ? "step" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4",
                isNext ? "border-success/40 bg-success/5" : "border-border",
                step.done && "bg-transparent",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  step.done ? "border-success bg-success text-white" : isNext ? "border-success" : "border-border",
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className={cn("text-app-base font-semibold", step.done ? "text-muted-foreground" : "text-foreground")}>
                  {t(`dashboard.setup.steps.${step.id}.title`)}
                  <span className="sr-only"> {step.done ? `(${t("dashboard.setup.done")})` : ""}</span>
                </p>
                <p className="text-app-sm text-muted-foreground">{t(`dashboard.setup.steps.${step.id}.description`)}</p>
              </div>
              {!step.done ? (
                <Link
                  href={step.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 self-center rounded-lg px-3 py-1.5 text-app-sm font-semibold transition-colors",
                    isNext ? "bg-success text-white hover:bg-success/90" : "text-success hover:bg-success/10",
                  )}
                >
                  {isNext ? t("dashboard.setup.next") : t("dashboard.setup.doIt")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Getting-started checklist for the dashboard. Shown to owners and admins until every step is done,
 * then it disappears by itself. Nothing is shown while loading or if the data cannot be read.
 */
export function SetupChecklistCard() {
  const { currentRole } = useCurrentOrganization();
  const { data: facts } = useSetupFactsQuery();
  const checklist = useMemo(() => (facts ? buildSetupChecklist(facts, { billingEnabled: isBillingEnabled() }) : null), [facts]);

  if (!canManageMembers(currentRole) || !checklist || checklist.complete) return null;
  return <SetupChecklistView checklist={checklist} />;
}
