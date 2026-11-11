"use client";

import { copyFor, langOf } from "@/components/landing/v2/content";
import {
  BookingsListFragment,
  CustomerFragment,
  InvoiceFragment,
  PackageFragment,
  ReportFragment,
} from "@/components/landing/v2/fragments";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

export function Showcase() {
  const { locale } = useTranslation();
  const copy = copyFor(locale);
  const lang = langOf(locale);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const panels = [
    <BookingsListFragment key="b" copy={copy} />,
    <InvoiceFragment key="i" copy={copy} locale={lang} />,
    <CustomerFragment key="c" copy={copy} locale={lang} />,
    <PackageFragment key="p" copy={copy} locale={lang} />,
    <ReportFragment key="r" copy={copy} />,
  ];

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const mid = row.scrollLeft + row.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slotRefs.current.forEach((slot, i) => {
      if (!slot) return;
      const d = Math.abs(slot.offsetLeft + slot.offsetWidth / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    measure();
  }, [measure, locale]);

  function go(i: number) {
    slotRefs.current[i]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }

  return (
    <section
      aria-labelledby="lp-showcase"
      className="bg-[#0c1f16] py-[clamp(56px,7vw,112px)] text-white"
    >
      <h2
        id="lp-showcase"
        className="lp-x text-[clamp(28px,3vw,44px)] leading-[1.1] font-bold tracking-[-0.025em] text-white"
      >
        {copy.showcase.title}
      </h2>

      <div
        ref={rowRef}
        onScroll={measure}
        tabIndex={0}
        aria-label={copy.showcase.title}
        className="lp-row mt-10 flex snap-x snap-mandatory items-center gap-[clamp(24px,6vw,96px)] overflow-x-auto px-[calc(50%-min(43vw,220px))] py-6 focus-visible:outline-3 focus-visible:outline-[#85b098]"
      >
        {panels.map((panel, i) => (
          <div
            key={i}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            aria-hidden={i !== active}
            inert={i !== active}
            className={cn(
              "flex w-[min(86vw,440px)] shrink-0 snap-center justify-center transition-[opacity,transform] duration-300 ease-out",
              i === active
                ? "scale-100 opacity-100"
                : "scale-[0.94] opacity-60",
            )}
          >
            {panel}
          </div>
        ))}
      </div>

      <div className="lp-x mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div key={active} className="lp-swap max-w-[46ch]">
          <p className="text-[24px] leading-tight font-semibold">
            {copy.showcase.panels[active].name}
          </p>
          <p className="mt-2 text-[17px] leading-[1.5] text-[#d6e6dc]">
            {copy.showcase.panels[active].text}
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label={copy.showcase.title}>
          {copy.showcase.panels.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => go(i)}
              aria-label={p.name}
              aria-current={i === active}
              className={cn(
                "lp-press h-3 rounded-full transition-[width,background-color]",
                i === active ? "w-10 bg-white" : "w-3 bg-[#5f8a73]",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
