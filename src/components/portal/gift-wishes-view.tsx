"use client";

import { ExternalLink, Gift, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { BotanicalSprig } from "@/components/brand/botanical";
import { AddFab } from "@/components/portal/add-fab";
import { CollapsibleCard } from "@/components/portal/collapsible-card";
import { PORTAL_SHEET } from "@/components/portal/sheet-style";
import { useNok } from "@/components/portal/use-nok";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { deleteGiftWish, saveGiftSettings, saveGiftWish, type GiftResult } from "@/lib/portal/gift-actions";
import { MAX_GIFT_QUANTITY, parseGiftPrice, parseGiftQuantity, REVEAL_MODES, type CoupleGiftWish, type GiftKind, type GiftSettings, type RevealMode } from "@/lib/portal/gift-rules";
import { cn } from "@/lib/utils";

type Draft = { id?: string; kind: GiftKind; title: string; url: string; imageUrl: string; price: string; quantity: string; note: string };
const emptyDraft: Draft = { kind: "gift", title: "", url: "", imageUrl: "", price: "", quantity: "1", note: "" };

const REVEAL_LABEL: Record<RevealMode, TranslationKey> = {
  event_date: "portal.gifts.revealEventDate",
  never: "portal.gifts.revealNever",
  now: "portal.gifts.revealNow",
};

/** Shown to the couple only: their own gift wish list (not the venue wish list) and how it is shared. */
export function GiftWishesView({ wishes, settings, giversShown }: { wishes: CoupleGiftWish[]; settings: GiftSettings; giversShown: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const nok = useNok();
  const [sheet, setSheet] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveSettings(next: GiftSettings) {
    setBusy(true);
    const r = await saveGiftSettings(next);
    setBusy(false);
    if (!r.ok) toast.error(t("portal.gifts.errGeneric"));
    router.refresh();
  }

  const takenPlaces = wishes.reduce((n, w) => n + w.takenCount, 0);
  const totalPlaces = wishes.reduce((n, w) => n + w.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      <CollapsibleCard
        title={t("portal.gifts.shareTitle")}
        help={t("portal.gifts.shareHelp")}
        summary={settings.shared ? t("portal.gifts.shareOn") : t("portal.gifts.shareOff")}
        decor={<BotanicalSprig className="pointer-events-none absolute -right-3 -top-3 h-28 w-20 text-primary/15" />}
      >
        <button
          type="button"
          role="switch"
          aria-checked={settings.shared}
          disabled={busy}
          onClick={() => void saveSettings({ ...settings, shared: !settings.shared })}
          className={cn(
            "flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left ring-1 transition-colors disabled:opacity-60",
            settings.shared ? "bg-primary-soft ring-primary/40" : "bg-background ring-gold/40",
          )}
        >
          <span className="text-app-base font-semibold">{settings.shared ? t("portal.gifts.shareOn") : t("portal.gifts.shareOff")}</span>
          <span aria-hidden className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors", settings.shared ? "bg-primary" : "bg-foreground/20")}>
            <span className={cn("absolute top-1 size-6 rounded-full bg-white shadow transition-all", settings.shared ? "left-7" : "left-1")} />
          </span>
        </button>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-app-sm font-semibold">{t("portal.gifts.revealTitle")}</legend>
          <p className="text-app-xs text-muted-foreground">{t("portal.gifts.revealHelp")}</p>
          <div role="radiogroup" aria-label={t("portal.gifts.revealTitle")} className="flex flex-col gap-2">
            {REVEAL_MODES.map((mode) => {
              const on = settings.revealMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={busy}
                  onClick={() => void saveSettings({ ...settings, revealMode: mode })}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-app-base font-semibold ring-1 transition-colors disabled:opacity-60",
                    on ? "bg-primary-soft ring-2 ring-primary" : "bg-card ring-gold/40",
                  )}
                >
                  <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border-2", on ? "border-primary" : "border-gold/60")}>
                    {on ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                  </span>
                  {t(REVEAL_LABEL[mode])}
                </button>
              );
            })}
          </div>
          <p className="text-app-xs font-medium text-muted-foreground">{giversShown ? t("portal.gifts.giversShown") : t("portal.gifts.giversHidden")}</p>
        </fieldset>
      </CollapsibleCard>

      {wishes.length === 0 ? (
        <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed border-gold/60 bg-card px-6 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary ring-1 ring-gold/50">
            <Gift className="size-8" aria-hidden />
          </span>
          <p className="text-app-base text-muted-foreground">{t("portal.gifts.empty")}</p>
          <Button type="button" variant="success" size="cta" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.gifts.emptyCta")}
          </Button>
        </div>
      ) : (
        <>
          <p className="px-1 text-app-sm font-semibold text-muted-foreground">{t("portal.gifts.summary", { taken: takenPlaces, total: totalPlaces })}</p>
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
            {wishes.map((w) => (
              <li key={w.id} className={cn("relative flex overflow-hidden rounded-3xl bg-card shadow-rn-card ring-1", w.takenCount >= w.quantity ? "ring-success/40" : "ring-gold/40")}>
                <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", w.takenCount >= w.quantity ? "bg-success" : w.takenCount > 0 ? "bg-gradient-to-b from-success to-gold" : "bg-gold")} />
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 p-4 pl-5 text-left"
                  onClick={() => setSheet({ id: w.id, kind: w.kind, title: w.title, url: w.url ?? "", imageUrl: w.imageUrl ?? "", price: w.priceNok === null ? "" : String(w.priceNok), quantity: String(w.quantity), note: w.note })}
                >
                  <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft text-gold ring-1 ring-gold/30">
                    {w.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- couple-supplied https URL, shown only to the couple
                      <img src={w.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    ) : (
                      <Gift className="size-7" aria-hidden />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {w.kind === "gift" ? t("portal.gifts.kindGift") : t("portal.gifts.kindOther")}
                    </span>
                    <span className="break-words font-serif text-lg font-semibold leading-snug">{w.title}</span>
                    {w.priceNok !== null || w.quantity > 1 ? (
                      <span className="text-app-sm font-semibold text-primary">
                        {[w.priceNok !== null ? nok(w.priceNok) : null, w.quantity > 1 ? t("portal.gifts.quantityUnit", { count: w.quantity }) : null].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    {w.note ? <span className="whitespace-pre-wrap break-words text-app-sm text-muted-foreground">{w.note}</span> : null}
                    <span className={cn("mt-1 w-fit rounded-full px-3 py-1 text-app-xs font-semibold", w.takenCount >= w.quantity ? "bg-success/15 text-success" : w.takenCount > 0 ? "bg-success/10 text-success" : "bg-gold/20 text-primary")}>
                      {w.quantity === 1
                        ? w.takenCount === 0
                          ? t("portal.gifts.free")
                          : w.giverNames.length > 0
                            ? t("portal.gifts.givenBy", { name: w.giverNames[0] })
                            : t("portal.gifts.taken")
                        : w.takenCount === 0
                          ? t("portal.gifts.freeMany", { total: w.quantity })
                          : w.giverNames.length > 0
                            ? t("portal.gifts.takenOfNames", { taken: w.takenCount, total: w.quantity, names: w.giverNames.join(", ") })
                            : t("portal.gifts.takenOf", { taken: w.takenCount, total: w.quantity })}
                    </span>
                  </span>
                </button>
                {w.url ? (
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={t("portal.gifts.openLink")}
                    className="mr-3 mt-4 flex size-11 shrink-0 items-center justify-center self-start rounded-full bg-background ring-1 ring-gold/50"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="cta" className="hidden w-full sm:inline-flex" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.gifts.add")}
          </Button>
          <AddFab label={t("portal.gifts.add")} onClick={() => setSheet({ ...emptyDraft })} />
        </>
      )}

      <Sheet open={sheet !== null} onOpenChange={(o) => (o ? undefined : setSheet(null))}>
        <SheetContent side="bottom" className={cn(PORTAL_SHEET, "max-h-[92dvh] overflow-y-auto")}>
          {sheet ? (
            <>
              <SheetHeader>
                <SheetTitle>{sheet.id ? t("portal.gifts.editTitle") : t("portal.gifts.addTitle")}</SheetTitle>
              </SheetHeader>
              <GiftForm
                key={sheet.id ?? "new"}
                initial={sheet}
                onCancel={() => setSheet(null)}
                onDone={() => {
                  setSheet(null);
                  router.refresh();
                }}
              />
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function GiftForm({ initial, onCancel, onDone }: { initial: Draft; onCancel: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setF((s) => ({ ...s, [key]: value }));

  async function settle(action: () => Promise<GiftResult>, success: string) {
    setBusy(true);
    const r = await action();
    setBusy(false);
    if (r.ok) {
      toast.success(success);
      onDone();
    } else toast.error(r.error === "invalid" ? t("portal.gifts.errInvalid") : r.error === "limit" ? t("portal.gifts.errLimit") : r.error === "below_taken" ? t("portal.gifts.errBelowTaken") : t("portal.gifts.errGeneric"));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const priceNok = parseGiftPrice(f.price);
    if (priceNok === undefined) return void toast.error(t("portal.gifts.errInvalid"));
    const quantity = parseGiftQuantity(f.quantity);
    if (quantity === undefined) return void toast.error(t("portal.gifts.errInvalid"));
    void settle(
      () => saveGiftWish({ id: f.id, kind: f.kind, title: f.title, url: f.url || null, imageUrl: f.imageUrl || null, priceNok, quantity, note: f.note }),
      t("portal.gifts.saved"),
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-app-sm font-semibold">{t("portal.gifts.kindLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["gift", "other"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={f.kind === k}
              onClick={() => set("kind", k)}
              className={cn("min-h-11 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors", f.kind === k ? "bg-primary text-primary-foreground ring-gold/60" : "bg-card ring-gold/40")}
            >
              {k === "gift" ? t("portal.gifts.kindGift") : t("portal.gifts.kindOther")}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <Label htmlFor="g-title">{t("portal.gifts.fieldTitle")}</Label>
        <Input id="g-title" required value={f.title} maxLength={80} placeholder={t("portal.gifts.fieldTitleHint")} onChange={(e) => set("title", e.target.value)} className="h-12 !text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="g-qty">{t("portal.gifts.fieldQuantity")}</Label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="−"
            disabled={(parseGiftQuantity(f.quantity) ?? 1) <= 1}
            onClick={() => set("quantity", String(Math.max(1, (parseGiftQuantity(f.quantity) ?? 1) - 1)))}
            className="flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-gold/50 transition-transform enabled:active:scale-95 disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <Input id="g-qty" inputMode="numeric" value={f.quantity} maxLength={2} onChange={(e) => set("quantity", e.target.value.replace(/\D/g, "").slice(0, 2))} className="h-12 w-20 text-center !text-lg font-semibold" />
          <button
            type="button"
            aria-label="+"
            disabled={(parseGiftQuantity(f.quantity) ?? 1) >= MAX_GIFT_QUANTITY}
            onClick={() => set("quantity", String(Math.min(MAX_GIFT_QUANTITY, (parseGiftQuantity(f.quantity) ?? 0) + 1)))}
            className="flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-gold/50 transition-transform enabled:active:scale-95 disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-app-xs text-muted-foreground">{t("portal.gifts.fieldQuantityHelp")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="g-url">{t("portal.gifts.fieldUrl")}</Label>
        <Input id="g-url" type="url" inputMode="url" value={f.url} maxLength={500} placeholder={t("portal.gifts.fieldUrlHint")} onChange={(e) => set("url", e.target.value)} className="h-12 !text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="g-image">{t("portal.gifts.fieldImage")}</Label>
        <Input id="g-image" type="url" inputMode="url" value={f.imageUrl} maxLength={500} placeholder={t("portal.gifts.fieldUrlHint")} onChange={(e) => set("imageUrl", e.target.value)} className="h-12 !text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="g-price">{t("portal.gifts.fieldPrice")}</Label>
        <Input id="g-price" inputMode="decimal" value={f.price} maxLength={12} onChange={(e) => set("price", e.target.value)} className="h-12 !text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="g-note">{t("portal.gifts.fieldNote")}</Label>
        <Textarea id="g-note" value={f.note} maxLength={300} placeholder={t("portal.gifts.fieldNoteHint")} onChange={(e) => set("note", e.target.value)} className="!min-h-20 !text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Button type="submit" variant="success" size="cta" disabled={busy}>
          {t("portal.gifts.save")}
        </Button>
        <Button type="button" variant="outline" size="cta" disabled={busy} onClick={onCancel}>
          {t("portal.gifts.cancel")}
        </Button>
        {f.id ? (
          <Button
            type="button"
            variant="ghost"
            size="cta"
            disabled={busy}
            className="text-destructive"
            onClick={() => {
              if (window.confirm(t("portal.gifts.confirmDelete"))) void settle(() => deleteGiftWish(f.id!), t("portal.gifts.deleted"));
            }}
          >
            {t("portal.gifts.delete")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
