"use client";

import { ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { readCompletionFlag, writeCompletionFlag } from "@/features/setup-checklist/lib/completion-memory";
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

/** The short message shown once, when the last step is done. */
export function SetupCompleteBanner({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation();

  return (
    <section
      role="status"
      aria-label={t("dashboard.setup.completeTitle")}
      className={cn(RN_CARD_SHELL, "flex items-start gap-4 border border-success/40 bg-success/5 p-5 md:p-6")}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white" aria-hidden>
        <Check className="size-4" strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="font-heading text-app-lg font-bold text-foreground">{t("dashboard.setup.completeTitle")}</h2>
        <p className="text-app-base text-muted-foreground">{t("dashboard.setup.completeBody")}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dashboard.setup.dismiss")}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </section>
  );
}

/**
 * Getting-started checklist for the dashboard. Shown to owners and admins until every step is done.
 * When the last step is done, a short message replaces it once (only for people who saw it unfinished here),
 * and after it is closed nothing is shown. Nothing is shown while loading or if the data cannot be read.
 */
export function SetupChecklistCard() {
  const { currentRole, currentOrganizationId } = useCurrentOrganization();
  const { data: facts } = useSetupFactsQuery();
  const checklist = useMemo(() => (facts ? buildSetupChecklist(facts, { billingEnabled: isBillingEnabled() }) : null), [facts]);
  const [closedNow, setClosedNow] = useState(false);

  // Remember that this browser has seen the checklist unfinished; that is what earns the message at the end.
  const incomplete = checklist ? !checklist.complete : false;
  useEffect(() => {
    if (currentOrganizationId && incomplete) writeCompletionFlag(currentOrganizationId, "seenIncomplete");
  }, [currentOrganizationId, incomplete]);

  if (!canManageMembers(currentRole) || !checklist || !currentOrganizationId) return null;
  if (!checklist.complete) return <SetupChecklistView checklist={checklist} />;

  const showComplete =
    !closedNow &&
    readCompletionFlag(currentOrganizationId, "seenIncomplete") &&
    !readCompletionFlag(currentOrganizationId, "dismissed");
  if (!showComplete) return null;
  return (
    <SetupCompleteBanner
      onDismiss={() => {
        writeCompletionFlag(currentOrganizationId, "dismissed");
        setClosedNow(true);
      }}
    />
  );
}
