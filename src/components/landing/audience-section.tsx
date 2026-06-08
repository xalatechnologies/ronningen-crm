import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import { AUDIENCE, SECTION_TITLES } from "@/components/landing/landing-content";
import { Building2 } from "lucide-react";

export function AudienceSection() {
  return (
    <LandingSectionShell
      titleId="landing-audience-title"
      title={SECTION_TITLES.audience}
    >
      <ul className="mx-auto flex w-full flex-wrap justify-center gap-3">
        {AUDIENCE.map((item) => (
          <li
            key={item}
            className="inline-flex items-center gap-2 rounded-full border-2 border-rn-border-strong bg-card px-4 py-2.5 text-sm font-medium text-rn-text-body shadow-sm md:text-base"
          >
            <Building2 className="size-4 text-success" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </LandingSectionShell>
  );
}
