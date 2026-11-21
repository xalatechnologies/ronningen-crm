"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import type { SetupProgress } from "@/features/settings/lib/setup-progress";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { cn } from "@/lib/utils";

/** What is done and what is left to set up, as a percentage and two lists. Shown to owners and admins. */
export function SetupProgressCard({ progress }: { progress: SetupProgress }) {
  const { t } = useTranslation();
  const open = progress.items.filter((item) => !item.done);
  const done = progress.items.filter((item) => item.done);
  const text = (id: string, part: "title" | "hint") => t(`settings.progress.items.${id}.${part}` as TranslationKey);

  return (
    <section aria-labelledby="setup-progress-title" className="flex flex-col gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/8 md:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="setup-progress-title" className="font-heading text-lg font-bold text-rn-text-heading">
            {t("settings.progress.title")}
          </h2>
          <p className="mt-1 text-app-sm text-muted-foreground">{t("settings.progress.summary", { done: progress.doneCount, total: progress.total })}</p>
        </div>
        <p className="font-heading text-4xl leading-none font-extrabold tracking-tight text-success tabular-nums md:text-5xl">{progress.percent} %</p>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label={t("settings.progress.percentAria", { percent: progress.percent })}
        className="h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${progress.percent}%` }} />
      </div>

      {open.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-status-success-bg px-4 py-3 text-app-sm font-semibold text-status-success-text">
          <Check className="size-4" strokeWidth={3} aria-hidden />
          {t("settings.progress.allDone")}
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-app-xs font-bold tracking-wide text-muted-foreground uppercase">{t("settings.progress.todo")}</h3>
            <ul className="flex flex-col gap-2">
              {open.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3.5 py-3 ring-1 transition-colors hover:bg-muted/50",
                      item.id === progress.nextItem?.id ? "bg-success/5 ring-success/30" : "ring-foreground/10",
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-app-base font-semibold text-foreground">{text(item.id, "title")}</span>
                      <span className="text-app-sm text-muted-foreground">{text(item.id, "hint")}</span>
                    </span>
                    {item.id === progress.nextItem?.id ? (
                      <span className="hidden rounded-full bg-success px-2.5 py-1 text-[11px] font-bold text-white sm:inline">{t("settings.progress.nextStep")}</span>
                    ) : null}
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-app-xs font-bold tracking-wide text-muted-foreground uppercase">{t("settings.progress.done")}</h3>
            <ul className="flex flex-col gap-2">
              {done.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3 ring-1 ring-foreground/8">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-success-bg text-status-success-text">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="text-app-base font-medium text-foreground">{text(item.id, "title")}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
