"use client";

import { copyFor, langOf, STAGE_COUNT } from "@/components/landing/v2/content";
import { BookingFragment } from "@/components/landing/v2/fragments";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function HowItWorks() {
  const { locale } = useTranslation();
  const copy = copyFor(locale);
  const [stage, setStage] = useState(0);
  const fill = (stage / (STAGE_COUNT - 1)) * 100;

  return (
    <section
      id="slik-fungerer-det"
      aria-labelledby="lp-how"
      className="lp-x"
    >
      <h2 id="lp-how" className="sr-only">
        {copy.how.title}
      </h2>
      <div className="grid grid-rows-[auto_auto] lg:min-h-[88svh] lg:grid-cols-2 lg:grid-rows-1">
        <div className="order-2 flex flex-col justify-between gap-12 rounded-t-[8px] bg-[#1a4331] p-6 text-white lg:order-1 lg:rounded-l-[8px] lg:rounded-tr-none lg:p-10">
          <p
            key={stage}
            className="lp-swap max-w-[14ch] text-[clamp(32px,9vw,44px)] leading-[1.05] font-bold tracking-[-0.03em] lg:text-[clamp(40px,4.6vw,76px)]"
          >
            {copy.how.clauses[stage]}
          </p>
          <ol className="grid grid-cols-2 gap-x-6 gap-y-2 text-[16px] sm:grid-cols-4">
            {copy.booking.stages.map((name, i) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => setStage(i)}
                  className={cn(
                    "lp-press min-h-10 text-left",
                    i === stage ? "font-bold text-white" : "text-[#c0d6c9]",
                  )}
                >
                  {name}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="order-1 flex items-center justify-center rounded-b-none bg-[#e8f5ee] p-4 sm:p-6 lg:order-2 lg:rounded-r-[8px] lg:p-10">
          <div key={stage} className="lp-swap w-full max-w-[480px]">
            <BookingFragment
              copy={copy}
              locale={langOf(locale)}
              stage={stage}
              onStage={setStage}
              showHint={false}
            />
          </div>
        </div>
      </div>

      <div className="relative mt-6 h-8">
        <div
          aria-hidden
          className="absolute top-3 right-4 left-4 h-2 bg-[#d9e1de]"
        >
          <div
            className="h-full bg-[#1a1c1a] transition-[width] duration-200"
            style={{ width: `${fill}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={STAGE_COUNT - 1}
          step={1}
          value={stage}
          onChange={(e) => setStage(Number(e.target.value))}
          aria-label={copy.how.sliderLabel}
          aria-valuetext={copy.booking.stages[stage]}
          className="lp-range absolute inset-0"
        />
      </div>
    </section>
  );
}
