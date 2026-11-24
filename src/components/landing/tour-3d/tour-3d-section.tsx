"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LANDING_CONTAINER, LANDING_SECTION_X } from "@/components/landing/landing-layout";
import type { TourCopy } from "@/components/landing/tour-3d/screens/screen-types";
import {
  TOUR_STEP_COUNT,
  nextTourStep,
  previousTourStep,
  tourStepDuration,
} from "@/components/landing/tour-3d/tour-steps";
import { useReducedMotion } from "@/components/landing/tour-3d/use-reduced-motion";
import { useTourEngine } from "@/components/landing/tour-3d/use-tour-engine";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/translate";
import { cn } from "@/lib/utils";

const CONTROL =
  "flex size-11 items-center justify-center rounded-xl bg-card/90 text-foreground ring-1 ring-foreground/10 transition-colors hover:ring-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Caption({ copy, step, className }: { copy: TourCopy; step: number; className?: string }) {
  const current = copy.steps[step]!;
  const count =
    step === 0 ? copy.overviewCount : interpolate(copy.stepCount, { n: step, total: TOUR_STEP_COUNT - 1 });
  return (
    <div className={cn("rounded-2xl bg-card/95 px-5 py-4 ring-1 ring-foreground/8", className)}>
      <p className="text-xs font-bold tracking-[0.08em] text-primary uppercase">{count}</p>
      <h3 className="mt-1 text-lg leading-snug font-semibold text-balance text-foreground">{current.title}</h3>
      <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{current.text}</p>
    </div>
  );
}

/**
 * Landing section with a three.js tour of the app: five screens float in 3D and the camera follows one
 * booking from inquiry to customer portal. three.js loads only when the section comes near the viewport.
 * Plays by itself; the pause button, a click on a screen or step, or reduced motion stops it.
 */
export function Tour3dSection() {
  const { locale } = useTranslation();
  const copy = useMemo(() => getDictionary(locale).landing.tour3d, [locale]);
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectStep = useCallback((next: number) => {
    setStep(next);
    setManualPause(true);
  }, []);

  const { status, inView } = useTourEngine({
    stageRef,
    canvasRef,
    step,
    copy: copy.screens,
    locale,
    reducedMotion,
    onSelectStep: selectStep,
  });

  const playing = status === "ready" && inView && !reducedMotion && !manualPause;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setStep((s) => nextTourStep(s)), tourStepDuration(step));
    return () => window.clearTimeout(id);
  }, [playing, step]);

  const onStageKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectStep(nextTourStep(step));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectStep(previousTourStep(step));
    }
  };

  return (
    <section id="omvisning" aria-labelledby="landing-tour-title" className={cn(LANDING_SECTION_X, "py-16 md:py-24 lg:py-32")}>
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-8 md:gap-10")}>
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="text-sm font-bold tracking-[0.12em] text-primary uppercase">{copy.eyebrow}</p>
          <h2
            id="landing-tour-title"
            className="max-w-[22ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-foreground"
          >
            {copy.title}
          </h2>
          <p className="landing-subhead max-w-[52ch]">{copy.subtitle}</p>
        </div>

        <div className="flex flex-col gap-4">
          <div
            ref={stageRef}
            role="group"
            aria-label={copy.stageLabel}
            aria-busy={status === "loading"}
            tabIndex={0}
            onKeyDown={onStageKey}
            className="relative h-[clamp(360px,62vh,720px)] touch-pan-y overflow-hidden rounded-3xl bg-[radial-gradient(120%_90%_at_50%_15%,var(--rn-primary-soft),var(--rn-surface-segment)_70%)] ring-1 ring-foreground/8 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary"
          >
            <canvas ref={canvasRef} aria-hidden className="block size-full" />
            {status !== "ready" ? (
              <p className="absolute inset-0 grid place-items-center p-6 text-center text-base text-muted-foreground">
                {status === "unsupported" ? copy.noWebgl : copy.loading}
              </p>
            ) : (
              <p className="pointer-events-none absolute top-5 left-5 hidden text-sm text-muted-foreground lg:block">
                {copy.hint}
              </p>
            )}
            <div className="absolute top-3 right-3 flex gap-2">
              <button type="button" aria-label={copy.previous} className={CONTROL} onClick={() => selectStep(previousTourStep(step))}>
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              {reducedMotion ? null : (
                <button
                  type="button"
                  aria-label={manualPause ? copy.play : copy.pause}
                  className={CONTROL}
                  onClick={() => setManualPause((paused) => !paused)}
                >
                  {manualPause ? <Play className="size-5" aria-hidden /> : <Pause className="size-5" aria-hidden />}
                </button>
              )}
              <button type="button" aria-label={copy.next} className={CONTROL} onClick={() => selectStep(nextTourStep(step))}>
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </div>
            <Caption copy={copy} step={step} className="absolute bottom-4 left-4 hidden max-w-sm shadow-(--rn-shadow-card) lg:block" />
          </div>

          <Caption copy={copy} step={step} className="lg:hidden" />

          <ol className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-6 lg:overflow-visible">
            {copy.steps.map((item, i) => {
              const on = i === step;
              return (
                <li key={item.label} className="shrink-0 basis-40 lg:basis-auto">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => selectStep(i)}
                    className={cn(
                      "relative flex min-h-14 w-full flex-col items-start justify-center overflow-hidden rounded-xl bg-card px-3.5 py-2.5 text-left ring-1 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      on ? "bg-primary/8 ring-primary" : "ring-foreground/10 hover:ring-primary/60",
                    )}
                  >
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">{i === 0 ? "—" : i}</span>
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    {on && playing ? (
                      <span
                        key={step}
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary motion-reduce:hidden"
                        style={{ animation: `hiw-progress ${tourStepDuration(step)}ms linear forwards` }}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="text-sm text-muted-foreground">{copy.sampleNote}</p>
        </div>
      </div>
    </section>
  );
}
