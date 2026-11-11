import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type LandingSectionShellProps = {
  id?: string;
  titleId: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  tinted?: boolean;
};

export function LandingSectionShell({
  id,
  titleId,
  title,
  description,
  children,
  className,
  tinted = false,
}: LandingSectionShellProps) {
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        LANDING_SECTION_X,
        "py-16 md:py-24",
        tinted && "bg-rn-surface-wash/80",
        className,
      )}
    >
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-10 md:gap-12")}>
        <div className="mx-auto flex max-w-5xl flex-col gap-3 text-center">
          <h2
            id={titleId}
            className="landing-headline tracking-tight"
          >
            {title}
          </h2>
          {description ? (
            <p className="landing-body leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
