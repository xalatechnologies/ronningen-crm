import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import { PROBLEMS, SECTION_TITLES } from "@/components/landing/landing-content";
import { cn } from "@/lib/utils";

export function ProblemSection() {
  return (
    <LandingSectionShell
      titleId="landing-problem-title"
      title={SECTION_TITLES.problem}
      description="Tre vanlige flaskehalser som bremser hverdagen når alt ligger i regneark og e-post."
    >
      <div className="overflow-hidden rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-card shadow-rn-card">
        <ul className="divide-y-2 divide-rn-border-strong/50">
          {PROBLEMS.map(({ icon: Icon, title, text }, index) => {
            const isReversed = index % 2 === 1;

            return (
              <li
                key={title}
                className={cn(
                  "flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:gap-10 lg:p-10",
                  isReversed && "lg:flex-row-reverse",
                )}
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-4 lg:w-72",
                    isReversed && "lg:flex-row-reverse",
                  )}
                >
                  <span
                    className="font-heading text-5xl font-bold leading-none text-rn-text-heading/8 lg:text-6xl"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div
                    className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-rn-border-strong/70 bg-rn-surface-wash text-success shadow-sm"
                    aria-hidden
                  >
                    <Icon className="size-7" />
                  </div>
                </div>

                <div
                  className={cn(
                    "flex flex-1 flex-col gap-2 border-rn-border-strong/60 lg:border-t-0 lg:py-2",
                    isReversed
                      ? "lg:border-r-2 lg:pr-10 lg:text-right"
                      : "lg:border-l-2 lg:pl-10 lg:text-left",
                  )}
                >
                  <h3 className="font-heading text-xl font-semibold text-rn-text-heading md:text-2xl">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-rn-text-slate md:text-base">
                    {text}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </LandingSectionShell>
  );
}
