import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import { PROBLEMS, SECTION_TITLES } from "@/components/landing/landing-content";
import { cn } from "@/lib/utils";

const SCATTERED_SOURCES = [
  { label: "E-post", rotate: "-rotate-2" },
  { label: "Excel", rotate: "rotate-1" },
  { label: "Notater", rotate: "-rotate-1" },
  { label: "Telefon", rotate: "rotate-2" },
  { label: "Kalender", rotate: "-rotate-3" },
] as const;

export function ProblemSection() {
  return (
    <LandingSectionShell
      titleId="landing-problem-title"
      title={SECTION_TITLES.problem}
      description="Tre vanlige flaskehalser som bremser hverdagen når alt ligger i regneark og e-post."
    >
      <div className="flex flex-col gap-8 md:gap-10">
        <div
          className="relative overflow-hidden rounded-[length:var(--app-radius)] border-2 border-dashed border-rn-border-strong bg-rn-surface-wash px-6 py-8 md:px-10 md:py-10"
          aria-hidden
        >
          <p className="text-center font-heading text-xs font-bold tracking-[0.2em] text-rn-text-slate uppercase md:text-sm">
            Uten ett system
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {SCATTERED_SOURCES.map(({ label, rotate }) => (
              <span
                key={label}
                className={cn(
                  "inline-flex rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-card px-4 py-2.5 font-heading text-sm font-semibold text-rn-text-body shadow-rn-card md:text-base",
                  rotate,
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <ul className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
          {PROBLEMS.map(({ icon: Icon, title, text }, index) => {
            const isBanner = index === 2;

            return (
              <li
                key={title}
                className={cn(isBanner && "lg:col-span-2")}
              >
                <article
                  className={cn(
                    "relative h-full overflow-hidden rounded-[length:var(--app-radius)] border-2 border-rn-border-strong shadow-rn-card",
                    isBanner
                      ? "flex flex-col gap-5 bg-success p-6 text-white sm:flex-row sm:items-center sm:gap-8 md:p-8 lg:p-10"
                      : "bg-card p-6 md:p-8",
                    index === 1 && "border-dashed bg-rn-surface-wash",
                  )}
                >
                  {!isBanner ? (
                    <span
                      className="pointer-events-none absolute top-3 right-4 font-heading text-7xl font-bold leading-none text-rn-text-heading/[0.04] md:text-8xl"
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  ) : null}

                  <div
                    className={cn(
                      "flex shrink-0 items-center gap-4",
                      isBanner && "sm:w-64",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-14 items-center justify-center rounded-[length:var(--app-radius)] border-2 md:size-16",
                        isBanner
                          ? "border-white/30 bg-white/10 text-primary-light"
                          : "border-rn-border-strong/70 bg-rn-surface-wash text-success",
                      )}
                      aria-hidden
                    >
                      <Icon className="size-7" />
                    </div>
                    {isBanner ? (
                      <span className="font-heading text-sm font-bold tracking-[0.18em] text-primary-light uppercase">
                        Flaskehals {index + 1}
                      </span>
                    ) : null}
                  </div>

                  <div className={cn("relative flex flex-col gap-2", isBanner && "flex-1")}>
                    <h3
                      className={cn(
                        "font-heading text-xl font-semibold md:text-2xl",
                        isBanner ? "text-white" : "text-rn-text-heading",
                      )}
                    >
                      {title}
                    </h3>
                    <p
                      className={cn(
                        "text-sm leading-relaxed md:text-base",
                        isBanner ? "text-primary-light" : "text-rn-text-slate",
                      )}
                    >
                      {text}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </LandingSectionShell>
  );
}
