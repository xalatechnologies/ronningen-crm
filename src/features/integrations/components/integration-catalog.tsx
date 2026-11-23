import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { INTEGRATIONS, groupIntegrations, type IntegrationDefinition } from "@/features/integrations/lib/catalog";
import { getServerTranslation } from "@/i18n/server";
import type { TranslationKey, Translator } from "@/i18n/types";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

function IntegrationCard({ item, t }: { item: IntegrationDefinition; t: Translator }) {
  const Icon = item.icon;
  const available = item.status === "available" && item.href;
  return (
    <li className={cn(RN_CARD_SHELL, "flex flex-col gap-3 p-5", !available && "bg-card/60")}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground ring-1 ring-foreground/10">
          <Icon className="size-5" aria-hidden />
        </span>
        <StatusBadge tone={available ? "success" : "neutral"} dot={false}>
          {available ? t("appPages.settings.integrations.available") : t("appPages.settings.integrations.comingSoon")}
        </StatusBadge>
      </div>
      <div className="min-w-0">
        <h3 className="font-heading text-base font-semibold text-foreground">{item.name}</h3>
        <p className="mt-1 text-app-sm leading-relaxed text-muted-foreground">
          {t(`appPages.settings.integrations.catalog.${item.id}` as TranslationKey)}
        </p>
      </div>
      {available ? (
        <Link
          href={item.href as string}
          className="mt-auto inline-flex w-fit items-center gap-1 rounded-sm text-app-sm font-semibold text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:!text-white"
        >
          {t("appPages.settings.integrations.open")}
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </li>
  );
}

/** Integrations that can be used now, as cards that open their settings. Renders nothing when there are none. */
export async function AvailableIntegrations({ items = INTEGRATIONS }: { items?: readonly IntegrationDefinition[] }) {
  const { t } = await getServerTranslation();
  const available = items.filter((item) => item.status === "available");
  if (available.length === 0) return null;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {available.map((item) => (
        <IntegrationCard key={item.id} item={item} t={t} />
      ))}
    </ul>
  );
}

/** Integrations we are still building, grouped by category, each marked "Coming soon". */
export async function IntegrationCatalog({ items = INTEGRATIONS }: { items?: readonly IntegrationDefinition[] }) {
  const { t } = await getServerTranslation();
  const groups = groupIntegrations(items.filter((item) => item.status === "coming_soon"));

  return (
    <section aria-labelledby="integration-catalog-title" className="flex flex-col gap-6">
      <div>
        <h2 id="integration-catalog-title" className="font-heading text-lg font-bold">
          {t("appPages.settings.integrations.comingSoonTitle")}
        </h2>
        <p className="mt-1 text-app-sm text-muted-foreground">{t("appPages.settings.integrations.comingSoonDescription")}</p>
      </div>

      {groups.map((group) => (
        <div key={group.category} role="group" aria-labelledby={`integration-group-${group.category}`} className="flex flex-col gap-3">
          <h3 id={`integration-group-${group.category}`} className="text-app-sm font-semibold text-muted-foreground">
            {t(`appPages.settings.integrations.categories.${group.category}`)}
          </h3>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <IntegrationCard key={item.id} item={item} t={t} />
            ))}
          </ul>
        </div>
      ))}

      <div className={cn(RN_CARD_SHELL, "flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6")}>
        <div>
          <p className="font-semibold text-foreground">{t("appPages.settings.integrations.requestTitle")}</p>
          <p className="text-app-sm text-muted-foreground">{t("appPages.settings.integrations.requestBody")}</p>
        </div>
        <Link
          href="/app/settings/support"
          className="rounded-sm text-app-sm font-semibold text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:!text-white"
        >
          {t("appPages.settings.integrations.requestLink")}
        </Link>
      </div>
    </section>
  );
}
