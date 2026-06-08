import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import { FEATURES, SECTION_TITLES } from "@/components/landing/landing-content";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

export function FeaturesSection() {
  return (
    <LandingSectionShell
      id="funksjoner"
      titleId="landing-features-title"
      title={SECTION_TITLES.features}
      tinted
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className={cn(
              RN_CARD_SHELL,
              "flex flex-col gap-4 bg-card p-6 shadow-rn-card",
            )}
          >
            <div
              className="flex size-11 items-center justify-center rounded-[length:var(--app-radius)] border border-rn-border-strong/70 bg-rn-surface-wash text-success"
              aria-hidden
            >
              <Icon className="size-5" />
            </div>
            <div className="space-y-2">
              <h3 className="font-heading text-lg font-semibold text-rn-text-heading">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-rn-text-slate md:text-base">
                {text}
              </p>
            </div>
          </article>
        ))}
      </div>
    </LandingSectionShell>
  );
}
