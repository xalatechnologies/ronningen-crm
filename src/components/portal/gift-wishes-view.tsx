"use client";

import { ExternalLink, Gift, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Blossom, BotanicalSprig } from "@/components/brand/botanical";
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
import { parseGiftPrice, REVEAL_MODES, type CoupleGiftWish, type GiftKind, type GiftSettings, type RevealMode } from "@/lib/portal/gift-rules";
import { cn } from "@/lib/utils";

type Draft = { id?: string; kind: GiftKind; title: string; url: string; imageUrl: string; price: string; note: string };
const emptyDraft: Draft = { kind: "gift", title: "", url: "", imageUrl: "", price: "", note: "" };

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

  const takenCount = wishes.filter((w) => w.taken).length;

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
            "relative flex min-h-12 items-center justify-between gap-3 rounded-full px-5 text-app-base font-semibold ring-1 transition-colors disabled:opacity-60",
            settings.shared ? "bg-primary text-primary-foreground ring-gold/60" : "bg-background ring-gold/40",
          )}
        >
          {settings.shared ? t("portal.gifts.shareOn") : t("portal.gifts.shareOff")}
          <Blossom className={cn("size-5", settings.shared ? "text-gold" : "text-muted-foreground")} filled={settings.shared} />
        </button>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-app-sm font-semibold">{t("portal.gifts.revealTitle")}</legend>
          <p className="text-app-xs text-muted-foreground">{t("portal.gifts.revealHelp")}</p>
          <div className="flex flex-wrap gap-2">
            {REVEAL_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={settings.revealMode === mode}
                disabled={busy}
                onClick={() => void saveSettings({ ...settings, revealMode: mode })}
                className={cn(
                  "min-h-11 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors disabled:opacity-60",
                  settings.revealMode === mode ? "bg-primary text-primary-foreground ring-gold/60" : "bg-card ring-gold/40",
                )}
              >
                {t(REVEAL_LABEL[mode])}
              </button>
            ))}
          </div>
          <p className="text-app-xs font-medium text-muted-foreground">{giversShown ? t("portal.gifts.giversShown") : t("portal.gifts.giversHidden")}</p>
        </fieldset>
      </CollapsibleCard>

      {wishes.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-10 text-center shadow-rn-card ring-1 ring-gold/40">
          <Blossom className="size-10 text-gold" filled />
          <p className="text-app-base text-muted-foreground">{t("portal.gifts.empty")}</p>
          <Button type="button" variant="success" size="cta" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.gifts.emptyCta")}
          </Button>
        </div>
      ) : (
        <>
          <p className="px-1 text-app-sm font-semibold text-muted-foreground">{t("portal.gifts.summary", { taken: takenCount, total: wishes.length })}</p>
          <ul className="flex flex-col gap-3">
            {wishes.map((w) => (
              <li key={w.id} className="flex gap-3 rounded-3xl bg-card p-4 shadow-rn-card ring-1 ring-gold/40">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                  onClick={() => setSheet({ id: w.id, kind: w.kind, title: w.title, url: w.url ?? "", imageUrl: w.imageUrl ?? "", price: w.priceNok === null ? "" : String(w.priceNok), note: w.note })}
                >
                  <span className="flex items-center gap-2 text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Gift className="size-3.5 text-gold" aria-hidden />
                    {w.kind === "gift" ? t("portal.gifts.kindGift") : t("portal.gifts.kindOther")}
                  </span>
                  <span className="break-words font-serif text-lg font-semibold">{w.title}</span>
                  {w.priceNok !== null ? <span className="text-app-sm text-muted-foreground">{nok(w.priceNok)}</span> : null}
                  {w.note ? <span className="whitespace-pre-wrap break-words text-app-sm text-muted-foreground">{w.note}</span> : null}
                  <span className={cn("mt-1 w-fit rounded-full px-3 py-1 text-app-xs font-semibold", w.taken ? "bg-success/15 text-success" : "bg-gold/20 text-primary")}>
                    {w.taken ? (w.giverName ? t("portal.gifts.givenBy", { name: w.giverName }) : t("portal.gifts.taken")) : t("portal.gifts.free")}
                  </span>
                </button>
                {w.url ? (
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={t("portal.gifts.openLink")}
                    className="flex size-11 shrink-0 items-center justify-center self-start rounded-full bg-background ring-1 ring-gold/50"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="cta" className="w-full" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.gifts.add")}
          </Button>
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
    } else toast.error(r.error === "invalid" ? t("portal.gifts.errInvalid") : r.error === "limit" ? t("portal.gifts.errLimit") : t("portal.gifts.errGeneric"));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const priceNok = parseGiftPrice(f.price);
    if (priceNok === undefined) return void toast.error(t("portal.gifts.errInvalid"));
    void settle(
      () => saveGiftWish({ id: f.id, kind: f.kind, title: f.title, url: f.url || null, imageUrl: f.imageUrl || null, priceNok, note: f.note }),
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
