"use client";

import { ArrowRight, Check, ChevronRight } from "lucide-react";
import Link from "next/link";

import type { SetupProgress } from "@/features/settings/lib/setup-progress";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { cn } from "@/lib/utils";

const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Small progress ring with the percentage inside. */
function ProgressRing({ percent }: { percent: number }) {
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center" aria-hidden>
      <svg viewBox="0 0 48 48" className="size-full -rotate-90">
        <circle cx="24" cy="24" r={RING_RADIUS} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle
          cx="24"
          cy="24"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="stroke-success transition-[stroke-dasharray] duration-500"
          strokeDasharray={`${(percent / 100) * RING_LENGTH} ${RING_LENGTH}`}
        />
      </svg>
      <span className="absolute font-heading text-[13px] font-bold text-foreground tabular-nums">{percent} %</span>
    </span>
  );
}

/**
 * Setup progress for owners and admins. When everything is done it is one quiet line; while steps are open it
 * shows the percentage, the next step as a button, and the open steps as a short list.
 */
export function SetupProgressCard({ progress }: { progress: SetupProgress }) {
  const { t } = useTranslation();
  const open = progress.items.filter((item) => !item.done);
  const done = progress.items.filter((item) => item.done);
  const text = (id: string, part: "title" | "hint") => t(`settings.progress.items.${id}.${part}` as TranslationKey);

  if (open.length === 0) {
    return (
      <section aria-labelledby="setup-progress-title" className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/8">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-success-bg text-status-success-text">
          <Check className="size-[18px]" strokeWidth={3} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="setup-progress-title" className="text-app-base font-semibold text-foreground">
            {t("settings.progress.title")}
          </h2>
          <p className="text-app-sm text-muted-foreground">
            {t("settings.progress.allDone")} · {t("settings.progress.summary", { done: progress.doneCount, total: progress.total })}
          </p>
        </div>
        <p
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={100}
          aria-label={t("settings.progress.percentAria", { percent: 100 })}
          className="font-heading text-lg font-bold text-success tabular-nums"
        >
          100 %
        </p>
      </section>
    );
  }

  const next = progress.nextItem!;
  return (
    <section aria-labelledby="setup-progress-title" className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <ProgressRing percent={progress.percent} />
        <div className="min-w-0 flex-1">
          <h2 id="setup-progress-title" className="text-app-lg font-semibold text-rn-text-heading">
            {t("settings.progress.title")}
          </h2>
          <p className="text-app-sm text-muted-foreground">{t("settings.progress.summary", { done: progress.doneCount, total: progress.total })}</p>
        </div>
        <Link
          href={next.href}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-success px-4 text-app-sm font-semibold text-white transition-colors hover:bg-success/90"
        >
          {t("settings.progress.nextStep")}: {text(next.id, "title")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label={t("settings.progress.percentAria", { percent: progress.percent })}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${progress.percent}%` }} />
      </div>

      <ul className="grid gap-x-6 sm:grid-cols-2">
        {open.map((item) => (
          <li key={item.id} className="border-t border-foreground/8 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
            <Link
              href={item.href}
              className={cn("group flex items-center gap-3 py-3 transition-colors", item.id === next.id && "font-semibold")}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-app-base font-semibold text-foreground">{text(item.id, "title")}</span>
                <span className="text-app-sm font-normal text-muted-foreground">{text(item.id, "hint")}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      {done.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-foreground/8 pt-3 text-app-sm text-muted-foreground">
          <Check className="size-4 text-status-success-text" strokeWidth={3} aria-hidden />
          <span className="font-semibold text-foreground">{t("settings.progress.done")}:</span>
          {done.map((item) => text(item.id, "title")).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
