"use client";

import { ExternalLink, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/i18n/client";
import { claimGift, releaseGift } from "@/lib/portal/gift-public-actions";
import type { GuestGiftWish } from "@/lib/portal/gift-rules";
import { cn } from "@/lib/utils";

/** The couple's gift wishes on the guest's link. One tap marks a gift as yours; other givers are never named. */
export function GuestGifts({ token, wishes }: { token: string; wishes: GuestGiftWish[] }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());

  if (wishes.length === 0) return null;
  const nok = new Intl.NumberFormat(locale, { style: "currency", currency: "NOK", maximumFractionDigits: 0 });

  async function act(wish: GuestGiftWish) {
    setBusy(wish.id);
    setError(null);
    const r = wish.state === "mine" ? await releaseGift(token, wish.id) : await claimGift(token, wish.id);
    setBusy(null);
    if (!r.ok) setError(r.error === "taken" ? t("portal.guestPage.giftErrTaken") : r.error === "limit" ? t("portal.guestPage.giftErrLimit") : t("portal.guestPage.giftErrGeneric"));
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-rn-card ring-1 ring-gold/40">
      <div>
        <h2 className="font-serif text-xl font-semibold">{t("portal.guestPage.giftsTitle")}</h2>
        <p className="text-app-sm text-muted-foreground">{t("portal.guestPage.giftsHelp")}</p>
      </div>
      <ul className="flex flex-col gap-4">
        {wishes.map((w) => (
          <li key={w.id} className="flex flex-col gap-3 rounded-2xl bg-background p-4 ring-1 ring-gold/30">
            {w.imageUrl && !broken.has(w.id) ? (
              // eslint-disable-next-line @next/next/no-img-element -- couple-provided image, arbitrary host
              <img
                src={w.imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setBroken((s) => new Set(s).add(w.id))}
                className="h-40 w-full rounded-xl bg-card object-contain"
              />
            ) : null}
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-2 break-words font-serif text-lg font-semibold">
                <Gift className="size-4 shrink-0 text-gold" aria-hidden />
                {w.title}
              </p>
              {w.priceNok !== null ? <p className="text-app-sm text-muted-foreground">{nok.format(w.priceNok)}</p> : null}
              {w.note ? <p className="whitespace-pre-wrap break-words text-app-sm">{w.note}</p> : null}
              {w.url ? (
                <a href={w.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 w-fit items-center gap-1 text-app-sm font-semibold text-primary underline">
                  {t("portal.guestPage.giftOpen")}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
            {w.state === "taken" ? (
              <p className="rounded-full bg-muted px-4 py-3 text-center text-app-sm font-semibold text-muted-foreground">{t("portal.guestPage.giftTaken")}</p>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                aria-pressed={w.state === "mine"}
                onClick={() => void act(w)}
                className={cn(
                  "min-h-12 rounded-full px-4 text-app-base font-semibold ring-1 transition-colors disabled:opacity-60",
                  w.state === "mine" ? "bg-success text-white ring-success" : "bg-primary text-primary-foreground ring-gold/60",
                )}
              >
                {w.state === "mine" ? `${t("portal.guestPage.giftMine")} · ${t("portal.guestPage.giftRelease")}` : t("portal.guestPage.giftTake")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error ? <p className="text-app-sm font-medium text-destructive">{error}</p> : null}
    </section>
  );
}
