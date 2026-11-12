"use client";

import { FEATURE_ICONS } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { CheckIcon, FileCheck2Icon, MailOpenIcon, SendIcon } from "lucide-react";
import { useMemo } from "react";

const CONTRACT_INDEX = 6;

const CONTRACT_STEPS = [
  { label: "Sendt til kunde", meta: "Bryllup 14. jun", Icon: SendIcon },
  { label: "Åpnet av kunde", meta: "I dag 09:12", Icon: MailOpenIcon },
  { label: "Signert online", meta: "I dag 09:20", Icon: FileCheck2Icon },
];

export function FeaturesSection() {
  const { t, locale } = useTranslation();
  const features = useMemo(() => getDictionary(locale).landing.features.items, [locale]);
  const contract = features[CONTRACT_INDEX]!;
  const ContractIcon = FEATURE_ICONS[CONTRACT_INDEX]!;

  return (
    <section
      id="funksjoner"
      aria-labelledby="landing-features-title"
      className={cn(LANDING_SECTION_X, "py-16 md:py-24")}
    >
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-10 lg:gap-12")}>
        <h2
          id="landing-features-title"
          className="max-w-[26ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#0c1f16]"
        >
          {t("landing.sections.features")}
        </h2>

        <div className="grid gap-4 lg:grid-cols-12">
          <article className="flex flex-col justify-between gap-8 rounded-2xl bg-[#1a4331] p-6 md:p-8 lg:col-span-5">
            <div className="flex flex-col gap-4">
              <ContractIcon className="size-7 text-[#85b098]" aria-hidden />
              <h3 className="font-heading text-2xl font-semibold tracking-tight text-white">
                {contract.title}
              </h3>
              <p className="max-w-[40ch] text-base leading-relaxed text-[#d6e6dc]">
                {contract.text}
              </p>
            </div>
            <ol className="flex flex-col gap-2" aria-hidden>
              {CONTRACT_STEPS.map((step, i) => {
                const last = i === CONTRACT_STEPS.length - 1;
                return (
                  <li
                    key={step.label}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5",
                      last ? "bg-[#e8f5ee]" : "bg-white/10",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        last ? "bg-[#1a4331] text-white" : "bg-white/10 text-[#85b098]",
                      )}
                    >
                      <step.Icon className="size-[18px]" />
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-sm font-semibold",
                        last ? "text-[#0c1f16]" : "text-white",
                      )}
                    >
                      {step.label}
                    </span>
                    <span className={cn("text-xs", last ? "text-[#475569]" : "text-[#b9d3c4]")}>
                      {step.meta}
                    </span>
                    <CheckIcon
                      className={cn("size-4 shrink-0", last ? "text-[#1a4331]" : "text-[#85b098]")}
                    />
                  </li>
                );
              })}
            </ol>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {features.slice(0, CONTRACT_INDEX).map(({ title, text }, index) => {
              const Icon = FEATURE_ICONS[index]!;
              return (
                <article
                  key={title}
                  className="flex flex-col gap-3 rounded-2xl bg-[#eef2f0] p-5 md:p-6"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#1a4331] text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="font-heading text-lg font-semibold tracking-tight text-[#0c1f16]">
                    {title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#475569]">
                    {text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
