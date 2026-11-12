"use client";

import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { DIET_TAGS, type GuestSummary } from "@/lib/portal/guest-rules";

/** The venue's view of the guest list: numbers only. No names, e-mails or free text, by design. */
export function StaffGuests({ summary }: { summary: GuestSummary | null }) {
  const { t } = useTranslation();

  if (!summary || summary.total === 0) {
    return <p className="rounded-2xl bg-card px-6 py-10 text-center text-muted-foreground ring-1 ring-foreground/8">{t("portal.staffGuests.empty")}</p>;
  }

  const cells: { label: string; value: string; sub?: string }[] = [
    { label: t("portal.staffGuests.invited"), value: String(summary.invited), sub: summary.notSent > 0 ? `${t("portal.staffGuests.notSent")}: ${summary.notSent}` : undefined },
    { label: t("portal.staffGuests.coming"), value: String(summary.acceptedPeople), sub: t("portal.staffGuests.comingPeople", { count: summary.acceptedPeople }) },
    { label: t("portal.staffGuests.declined"), value: String(summary.declined) },
    { label: t("portal.staffGuests.maybe"), value: String(summary.maybe) },
    { label: t("portal.staffGuests.noAnswer"), value: String(summary.noAnswer) },
  ];
  const dietRows = DIET_TAGS.filter((tag) => (summary.diet[tag] ?? 0) > 0).map((tag) => ({ tag, count: summary.diet[tag] ?? 0 }));

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-foreground/5 px-4 py-3 text-app-sm text-muted-foreground">{t("portal.staffGuests.privacy")}</p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cells.map((c) => (
          <li key={c.label} className="flex flex-col gap-1 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
            <span className="text-app-sm text-muted-foreground">{c.label}</span>
            <span className="font-heading text-3xl font-bold tabular-nums">{c.value}</span>
            {c.sub ? <span className="text-app-xs text-muted-foreground">{c.sub}</span> : null}
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
        <h2 className="font-heading text-lg font-semibold">{t("portal.staffGuests.dietTitle")}</h2>
        {dietRows.length === 0 ? (
          <p className="text-app-sm text-muted-foreground">{t("portal.staffGuests.dietNone")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {dietRows.map((d) => (
              <li key={d.tag} className="flex items-center gap-2 rounded-full bg-foreground/6 px-3 py-1.5 text-app-sm font-semibold">
                {t(`portal.diet.tags.${d.tag}` as TranslationKey)}
                <span className="rounded-full bg-success px-2 text-app-xs text-white tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        )}
        {summary.comments > 0 ? <p className="text-app-sm text-muted-foreground">{t("portal.staffGuests.comments", { count: summary.comments })}</p> : null}
      </section>
    </div>
  );
}
