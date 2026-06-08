import {
  FOOTER,
  LANDING_NAV,
  LANDING_ROUTES,
} from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";
import Link from "next/link";

const footerLinkClass =
  "font-heading text-base font-semibold text-rn-text-slate transition-colors hover:text-success";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "border-t-2 border-rn-border-strong/60 bg-rn-surface-wash py-12 md:py-14",
        LANDING_SECTION_X,
      )}
    >
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-10 md:gap-12")}>
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 font-heading text-lg font-bold tracking-tight text-rn-text-heading"
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-[length:var(--app-radius)] border-2 border-rn-accent-border bg-success text-sm font-bold text-white"
                aria-hidden
              >
                R
              </span>
              {APP_NAME}
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-rn-text-slate md:text-base">
              {FOOTER.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-10">
            <nav className="flex flex-col gap-3" aria-label="Produktlenker">
              <p className="font-heading text-sm font-bold tracking-wide text-rn-text-heading uppercase">
                Produkt
              </p>
              <ul className="flex flex-col gap-2.5">
                {LANDING_NAV.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className={footerLinkClass}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="flex flex-col gap-3" aria-label="Kontolenker">
              <p className="font-heading text-sm font-bold tracking-wide text-rn-text-heading uppercase">
                Konto
              </p>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <Link href={LANDING_ROUTES.login} className={footerLinkClass}>
                    Logg inn
                  </Link>
                </li>
                <li>
                  <Link href={LANDING_ROUTES.register} className={footerLinkClass}>
                    Registrer
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t-2 border-rn-border-strong/40 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {APP_NAME}. Alle rettigheter reservert.
          </p>
          <p className="text-rn-text-slate">Norsk SaaS for lokaler og utleie.</p>
        </div>
      </div>
    </footer>
  );
}
