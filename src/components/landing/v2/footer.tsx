"use client";

import { copyFor } from "@/components/landing/v2/content";
import { useTranslation } from "@/i18n/client";

const LINKS = [
  { key: "features" as const, href: "#funksjoner" },
  { key: "howItWorks" as const, href: "#slik-fungerer-det" },
  { key: "pricing" as const, href: "#priser" },
  { key: "faq" as const, href: "#faq" },
];

export function LandingV2Footer() {
  const { t, locale } = useTranslation();
  const f = copyFor(locale).footer;
  const year = new Date().getFullYear();

  return (
    <footer className="lp-x pt-[clamp(72px,12vw,160px)] pb-8">
      <div className="flex flex-col gap-2 text-[15px] md:grid md:grid-cols-[1fr_auto_1fr] md:items-baseline md:gap-6">
        <p className="text-[#334155]">{f.what}</p>
        <nav
          aria-label={t("landing.footer.productLinksAria")}
          className="flex flex-wrap gap-x-6 gap-y-1"
        >
          {LINKS.map((l) => (
            <a
              key={l.key}
              href={l.href}
              className="font-medium text-[#0c1f16] hover:underline"
            >
              {t(`landing.nav.${l.key}`)}
            </a>
          ))}
        </nav>
        <p className="text-[#334155] md:text-right">
          © {year} {f.year} · {f.by}
        </p>
      </div>
    </footer>
  );
}
