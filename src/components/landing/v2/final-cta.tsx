"use client";

import { LANDING_ROUTES } from "@/components/landing/landing-content";
import { copyFor } from "@/components/landing/v2/content";
import { Reveal } from "@/components/landing/v2/reveal";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

export function FinalCta() {
  const { locale } = useTranslation();
  const c = copyFor(locale).cta;
  const [name, setName] = useState<string | null>(null);
  const [kind, setKind] = useState(0);
  const value = name ?? c.nameDefault;
  const href = `${LANDING_ROUTES.register}?venue=${encodeURIComponent(value.trim())}`;

  return (
    <section
      aria-labelledby="lp-cta"
      className="lp-x bg-[#1a4331] py-[clamp(56px,7vw,96px)] text-white"
    >
      <div className="grid min-h-[70svh] gap-10 lg:grid-cols-12 lg:items-center">
        <div className="flex flex-col justify-end gap-6 lg:col-span-6 lg:h-full">
          <Reveal as="h2" className="text-white">
            <span
              id="lp-cta"
              className="block text-[clamp(52px,13vw,76px)] leading-[0.92] font-bold tracking-[-0.04em] lg:text-[clamp(56px,7vw,112px)]"
            >
              {c.line1}
              <br />
              {c.line2}
            </span>
          </Reveal>
          <p className="max-w-[44ch] text-[17px] leading-[1.55] text-[#d6e6dc]">
            {c.text}
          </p>
        </div>

        <Reveal delay={100} className="lg:col-span-5 lg:col-start-8">
          <div
            data-ui
            role="group"
            aria-labelledby="lp-dialog"
            className="w-full max-w-[440px] rounded-[16px] bg-white p-6 text-[#1a1c1a] shadow-[0_24px_64px_rgba(0,0,0,0.28)] lg:ml-auto"
          >
            <p id="lp-dialog" className="text-[20px] font-bold">
              {c.dialogTitle}
            </p>

            <label
              htmlFor="lp-venue"
              className="mt-5 block text-[14px] font-semibold text-[#334155]"
            >
              {c.nameLabel}
            </label>
            <input
              id="lp-venue"
              type="text"
              value={value}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-[8px] bg-white px-3 text-[16px] ring-1 ring-[#b8c4be] focus-visible:ring-2 focus-visible:ring-[#1a4331] focus-visible:outline-none"
            />

            <p className="mt-5 text-[14px] font-semibold text-[#334155]">
              {c.kindLabel}
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-[10px] bg-[#eef2f0] p-1">
              {c.kinds.map((k, i) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === i}
                  onClick={() => setKind(i)}
                  className={cn(
                    "lp-press min-h-11 rounded-[8px] text-[15px] font-semibold",
                    kind === i
                      ? "bg-white text-[#1a4331] ring-1 ring-[#dfe6e2]"
                      : "text-[#334155]",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>

            <Link href={href} className="lp-btn mt-6 w-full">
              {c.button}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
