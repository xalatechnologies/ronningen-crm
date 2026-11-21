"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { FILM_SCENE_MS, nextFilmStep } from "@/components/landing/hero-film/film-clock";
import { BookingsScene } from "@/components/landing/hero-film/bookings-scene";
import { DashboardScene } from "@/components/landing/hero-film/dashboard-scene";
import { FilmWindow } from "@/components/landing/hero-film/film-window";
import { InquiryScene } from "@/components/landing/hero-film/inquiry-scene";
import { PortalScene } from "@/components/landing/hero-film/portal-scene";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

const FILM_ADDRESS: Record<string, string> = {
  overview: "eventmanager.no/app/dashboard",
  inquiry: "eventmanager.no/app/inquiries",
  payment: "eventmanager.no/app/bookings",
  portal: "eventmanager.no/portal",
};

/**
 * Hero product film: four short scenes that follow one booking from the dashboard to the customer portal.
 * Plays by itself and loops. Hover, focus or the pause button stops it; with reduced motion it never advances
 * on its own and the scenes show their finished state.
 */
export function HeroFilm() {
  const { locale } = useTranslation();
  const copy = useMemo(() => getDictionary(locale).landing.heroFilm, [locale]);
  const [active, setActive] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const stepCount = copy.steps.length;
  const playing = !reducedMotion && !manualPause && !hovered && !focused;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setActive((i) => nextFilmStep(i, stepCount)), FILM_SCENE_MS);
    return () => window.clearTimeout(id);
  }, [playing, active, stepCount]);

  const step = copy.steps[active]!;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={copy.ariaLabel}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <div aria-hidden>
        <FilmWindow address={FILM_ADDRESS[step.key] ?? "eventmanager.no"} demoLabel={copy.demo}>
          <div key={active} className="film-scene h-full">
            {step.key === "overview" ? <DashboardScene org={copy.sample.org} customer={copy.sample.customer} /> : null}
            {step.key === "inquiry" ? <InquiryScene sample={copy.sample} /> : null}
            {step.key === "payment" ? <BookingsScene sample={copy.sample} /> : null}
            {step.key === "portal" ? <PortalScene sample={copy.sample} /> : null}
          </div>
        </FilmWindow>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-2">
          {copy.steps.map((item, i) => {
            const isActive = i === active;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(i)}
                className="group min-w-0 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-success/40"
              >
                <span className="block h-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
                  <span
                    key={`${i}-${isActive && playing}`}
                    className={cn(
                      "block h-full origin-left rounded-full bg-success",
                      i < active || (isActive && !playing) ? "scale-x-100" : isActive ? "film-progress" : "scale-x-0",
                    )}
                    style={isActive && playing ? { animationDuration: `${FILM_SCENE_MS}ms` } : undefined}
                  />
                </span>
                <span
                  className={cn(
                    "mt-2 block truncate text-[12px] font-semibold transition-colors sm:text-[13px]",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setManualPause((p) => !p)}
          aria-label={manualPause ? copy.play : copy.pause}
          className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground ring-1 ring-foreground/10 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-success/40"
        >
          {manualPause ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
        </button>
      </div>

      <div className="mt-3 min-h-[4.5rem]" aria-live="polite">
        <p className="font-heading text-[15px] font-semibold text-foreground">{step.title}</p>
        <p className="mt-1 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">{step.text}</p>
      </div>
    </div>
  );
}
