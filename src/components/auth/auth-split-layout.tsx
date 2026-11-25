import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { APP_NAME } from "@/config/app";

type Props = {
  heading: string;
  body: string;
  points: string[];
  children: ReactNode;
};

/**
 * Two-column auth page: a calm brand panel on the left (from large screens) and the form on a plain surface on the right
 * with what the product gives you. On small screens only the form and a small brand header show.
 */
export function AuthSplitLayout({ heading, body, points, children }: Props) {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
      <div className="flex flex-col justify-center px-6 py-12 lg:order-2 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <AuthBrandMark />
            <span className="font-heading text-app-lg font-semibold text-foreground">{APP_NAME}</span>
          </div>
          {children}
        </div>
      </div>

      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar px-12 py-14 text-sidebar-foreground lg:order-1 lg:flex xl:px-16">
        <div className="flex items-center gap-3">
          <AuthBrandMark />
          <span className="font-heading text-app-lg font-semibold text-white">{APP_NAME}</span>
        </div>
        <div className="max-w-md space-y-8">
          <div className="space-y-4">
            <h2 className="font-heading text-app-3xl leading-tight font-bold tracking-tight text-white">{heading}</h2>
            <p className="text-app-base leading-relaxed text-white/75">{body}</p>
          </div>
          <ul className="space-y-4">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-app-base text-white/90">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check className="size-3.5" aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden />
      </aside>
    </main>
  );
}
