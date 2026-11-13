"use client";

import { Armchair, Flower2, Package, Plus, SprayCan, Speaker, TriangleAlert, UtensilsCrossed, Wine, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useNok } from "@/components/portal/use-nok";
import { WishStatusChip } from "@/components/portal/wish-status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import {
  counterQuote,
  deleteWishItem,
  reopenWish,
  respondToQuote,
  reviseWish,
  saveWishItem,
  sendWishes,
  withdrawWish,
  type WishResult,
} from "@/lib/portal/wishlist-actions";
import {
  approvedMixedVat,
  approvedTotalNok,
  canCounter,
  parsePriceInput,
  quoteExpired,
  WISH_CATEGORIES,
  type WishCategory,
  type WishItemView,
} from "@/lib/portal/wishlist-rules";
import { cn } from "@/lib/utils";

type Draft = { id?: string; status?: WishItemView["status"]; category: WishCategory; title: string; description: string; quantity: string; unit: string };
const CATEGORY_ICON: Record<WishCategory, LucideIcon> = {
  food: UtensilsCrossed,
  drink: Wine,
  decoration: Flower2,
  furniture: Armchair,
  av: Speaker,
  cleaning: SprayCan,
  other: Package,
};

/** Wishes grouped by what the customer should do with them, most urgent first. */
const SECTIONS: { id: string; label: TranslationKey; statuses: readonly WishItemView["status"][] }[] = [
  { id: "action", label: "portal.wishlist.sectionAction", statuses: ["quoted", "unavailable"] },
  { id: "draft", label: "portal.wishlist.sectionDraft", statuses: ["draft"] },
  { id: "sent", label: "portal.wishlist.sectionSent", statuses: ["requested", "countered"] },
  { id: "approved", label: "portal.wishlist.sectionApproved", statuses: ["approved"] },
  { id: "closed", label: "portal.wishlist.sectionClosed", statuses: ["declined", "withdrawn"] },
];

const emptyDraft: Draft = { category: "food", title: "", description: "", quantity: "1", unit: "" };

export function WishlistView({ items }: { items: WishItemView[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const nok = useNok();
  const [sheet, setSheet] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const drafts = items.filter((i) => i.status === "draft");
  const approved = approvedTotalNok(items);
  const quotedCount = items.filter((i) => i.status === "quoted").length;
  const unavailableCount = items.filter((i) => i.status === "unavailable").length;

  /** Runs one action, maps its result to a toast, and refreshes the page data. */
  async function run(key: string, action: () => Promise<WishResult>, success?: string) {
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (result.ok) {
      if (success) toast.success(success);
    } else if (result.error === "limit") {
      toast.error(t("portal.wishlist.counterLimit"));
    } else if (result.error === "expired") {
      toast.error(t("portal.wishlist.expired"));
    } else if (result.error === "wrong_state") {
      toast.error(t("portal.wishlist.wrongState"));
    } else {
      toast.error(t("portal.wishlist.failed"));
    }
    router.refresh();
    return result.ok;
  }

  const sections = SECTIONS.map((sec) => ({ ...sec, rows: items.filter((i) => sec.statuses.includes(i.status)) })).filter((sec) => sec.rows.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-foreground/8">
          <p className="text-app-base text-muted-foreground">{t("portal.wishlist.empty")}</p>
          <Button type="button" variant="success" size="cta" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.wishlist.emptyCta")}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-app-base text-muted-foreground">{t("portal.wishlist.countLine", { count: items.length })}</p>
            <Button type="button" variant="success" size="cta" onClick={() => setSheet({ ...emptyDraft })}>
              <Plus className="size-5" aria-hidden />
              {t("portal.wishlist.add")}
            </Button>
          </div>
          {quotedCount > 0 ? (
            <section role="status" className="flex flex-col gap-0.5 rounded-2xl bg-success px-4 py-3 !text-white">
              <h2 className="font-heading text-base font-bold !text-white">{t("portal.home.wishQuotedTitle", { count: quotedCount })}</h2>
              <p className="text-app-sm !text-white/90">{t("portal.home.wishQuotedBody")}</p>
            </section>
          ) : null}
          {unavailableCount > 0 ? (
            <section role="alert" className="flex items-start gap-3 rounded-2xl bg-destructive/10 px-4 py-3 ring-1 ring-destructive/30">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
              <p className="text-app-sm font-medium text-destructive">{t("portal.wishlist.unavailableBanner", { count: unavailableCount })}</p>
            </section>
          ) : null}
          {approved > 0 ? (
            <section className="flex flex-col gap-1 rounded-2xl bg-success/10 px-4 py-3 ring-1 ring-success/25">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-app-sm font-semibold">{t("portal.wishlist.approvedTitle")}</h2>
                <p className="font-heading text-xl font-bold tabular-nums">{nok(approved)}</p>
              </div>
              <p className="text-app-xs text-muted-foreground">
                {t("portal.wishlist.approvedNote")}
                {approvedMixedVat(items) ? ` ${t("portal.wishlist.mixedVat")}` : ""}
              </p>
            </section>
          ) : null}

          {sections.map((sec) => (
            <section key={sec.id} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
                {t(sec.label)}
                <span className="rounded-full bg-muted px-2.5 py-0.5 font-sans text-app-xs font-semibold tabular-nums text-muted-foreground">{sec.rows.length}</span>
              </h2>
              <ul className="flex flex-col gap-3">
                {sec.rows.map((item) => (
                  <li key={item.id}>
                    <WishCard item={item} busy={busy} run={run} onEdit={() => setSheet(toDraft(item))} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {drafts.length > 0 ? (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-foreground/8 bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:rounded-2xl sm:border">
          <Button
            type="button"
            variant="success"
            size="cta"
            className="w-full"
            disabled={busy === "send"}
            onClick={() => void run("send", sendWishes, t("portal.wishlist.sent"))}
          >
            {busy === "send"
              ? t("portal.wishlist.sending")
              : drafts.length === 1
                ? t("portal.wishlist.sendOne")
                : t("portal.wishlist.sendMany", { count: drafts.length })}
          </Button>
        </div>
      ) : null}

      <WishSheet
        draft={sheet}
        onClose={() => setSheet(null)}
        onSaved={() => {
          setSheet(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function toDraft(item: WishItemView): Draft {
  return {
    id: item.id,
    status: item.status,
    category: item.category,
    title: item.title,
    description: item.description ?? "",
    quantity: String(item.quantity),
    unit: item.unit ?? "",
  };
}

function WishCard({
  item,
  busy,
  run,
  onEdit,
}: {
  item: WishItemView;
  busy: string | null;
  run: (key: string, action: () => Promise<WishResult>, success?: string) => Promise<boolean>;
  onEdit: () => void;
}) {
  const { t, locale } = useTranslation();
  const nok = useNok();
  const [countering, setCountering] = useState(false);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [priceError, setPriceError] = useState(false);
  const working = busy?.startsWith(item.id) ?? false;
  const q = item.quote;
  const expired = q ? quoteExpired(q.validUntil) : false;
  const CategoryIcon = CATEGORY_ICON[item.category];

  async function submitCounter(event: FormEvent) {
    event.preventDefault();
    const parsed = parsePriceInput(price);
    if (parsed === null) return setPriceError(true);
    setPriceError(false);
    const ok = await run(`${item.id}:counter`, () => counterQuote({ itemId: item.id, quoteId: q!.id, unitPriceNok: parsed, note }));
    if (ok) {
      setCountering(false);
      setPrice("");
      setNote("");
    }
  }

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1",
        item.status === "unavailable" ? "ring-destructive/40" : item.status === "quoted" ? "ring-success/50" : "ring-foreground/8",
      )}
    >
      <header className="flex items-start gap-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <CategoryIcon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="break-words font-semibold">{item.title}</h3>
          <p className="text-app-sm text-muted-foreground">
            {t(`portal.wishlist.categories.${item.category}` as TranslationKey)} · {item.unit ? `${item.quantity.toLocaleString(locale)} ${item.unit}` : t("portal.wishlist.pieces", { count: item.quantity.toLocaleString(locale) })}
          </p>
        </div>
        <WishStatusChip status={item.status} />
      </header>

      {item.description ? <p className="whitespace-pre-wrap break-words text-app-sm text-muted-foreground">{item.description}</p> : null}

      {item.status === "requested" ? <p className="text-app-sm text-muted-foreground">{t("portal.wishlist.hintRequested")}</p> : null}
      {item.status === "unavailable" ? <p className="text-app-sm font-medium text-destructive">{t("portal.wishlist.hintUnavailable")}</p> : null}

      {q && (item.status === "quoted" || item.status === "approved" || item.status === "countered") ? (
        <div className="flex flex-col gap-1 rounded-xl bg-foreground/5 p-3">
          <p className="text-app-sm text-muted-foreground">
            {t("portal.wishlist.quoteLine", {
              price: nok(q.unitPriceNok),
              qty: item.quantity.toLocaleString(locale),
              total: nok(q.totalNok),
            })}
          </p>
          <p className="font-heading text-xl font-bold">
            {nok(q.totalNok)} <span className="text-app-sm font-medium text-muted-foreground">{q.vatIncluded ? t("portal.wishlist.vatIncluded") : t("portal.wishlist.vatExcluded")}</span>
          </p>
          {expired ? <p className="text-app-sm font-semibold text-destructive">{t("portal.wishlist.expiredBadge")} · {t("portal.wishlist.expired")}</p> : null}
          {q.validUntil ? (
            <p className="text-app-xs text-muted-foreground">
              {t("portal.wishlist.validUntil", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(q.validUntil)) })}
            </p>
          ) : null}
          {q.note ? <p className="text-app-sm">{t("portal.wishlist.venueNote", { note: q.note })}</p> : null}
        </div>
      ) : null}

      {item.status === "countered" && item.openCounter ? (
        <p className="text-app-sm font-medium">{t("portal.wishlist.counterWaiting", { price: nok(item.openCounter.proposedUnitPriceNok) })}</p>
      ) : null}

      {item.status === "quoted" ? (
        countering ? (
          <form onSubmit={(e) => void submitCounter(e)} className="flex flex-col gap-3 rounded-xl border border-foreground/10 p-3">
            <p className="font-semibold">{t("portal.wishlist.counterTitle")}</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`counter-${item.id}`}>{t("portal.wishlist.counterPrice")}</Label>
              <Input
                id={`counter-${item.id}`}
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={priceError}
                className="h-12 !text-base"
              />
              {priceError ? <p className="text-app-sm font-medium text-destructive">{t("portal.wishlist.invalidPrice")}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`counter-note-${item.id}`}>{t("portal.wishlist.counterNote")}</Label>
              <Textarea id={`counter-note-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="!min-h-20 !text-base" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="success" size="cta" className="flex-1" disabled={working}>
                {t("portal.wishlist.counterSend")}
              </Button>
              <Button type="button" variant="outline" size="cta" onClick={() => setCountering(false)}>
                {t("portal.wishlist.cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="success"
              size="cta"
              disabled={working || expired}
              onClick={() => void run(`${item.id}:approve`, () => respondToQuote({ itemId: item.id, quoteId: q!.id, answer: "approve" }))}
            >
              {t("portal.wishlist.approve")}
            </Button>
            <div className="flex gap-2">
              {canCounter({ counterRounds: item.counterRounds, hasOpenCounter: false }) ? (
                <Button type="button" variant="outline" size="cta" className="flex-1" disabled={working || expired} onClick={() => setCountering(true)}>
                  {t("portal.wishlist.counter")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="cta"
                className="flex-1"
                disabled={working}
                onClick={() => void run(`${item.id}:decline`, () => respondToQuote({ itemId: item.id, quoteId: q!.id, answer: "decline" }))}
              >
                {t("portal.wishlist.decline")}
              </Button>
            </div>
            {!canCounter({ counterRounds: item.counterRounds, hasOpenCounter: false }) ? (
              <p className="text-app-xs text-muted-foreground">{t("portal.wishlist.counterLimit")}</p>
            ) : null}
          </div>
        )
      ) : null}

      <footer className="flex flex-wrap gap-2 empty:hidden [&:not(:empty)]:border-t [&:not(:empty)]:border-foreground/8 [&:not(:empty)]:pt-3">
        {item.status === "draft" ? (
          <>
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onEdit}>
              {t("portal.wishlist.edit")}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="min-h-11" disabled={working} onClick={() => void run(`${item.id}:delete`, () => deleteWishItem(item.id))}>
              {t("portal.wishlist.delete")}
            </Button>
          </>
        ) : null}
        {item.status === "requested" || item.status === "quoted" || item.status === "countered" ? (
          <>
            <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={onEdit}>
              {t("portal.wishlist.revise")}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="min-h-11" disabled={working} onClick={() => void run(`${item.id}:withdraw`, () => withdrawWish(item.id))}>
              {t("portal.wishlist.withdraw")}
            </Button>
          </>
        ) : null}
        {item.status === "declined" || item.status === "withdrawn" || item.status === "unavailable" ? (
          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={working} onClick={() => void run(`${item.id}:reopen`, () => reopenWish(item.id))}>
            {t("portal.wishlist.reopen")}
          </Button>
        ) : null}
      </footer>
    </article>
  );
}

function WishSheet({ draft, onClose, onSaved }: { draft: Draft | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  // Remount the form per opened draft so fields start from that draft without effects.
  return (
    <Sheet open={draft !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        {draft ? (
          <>
            <SheetHeader>
              <SheetTitle>{draft.id ? t("portal.wishlist.editTitle") : t("portal.wishlist.addTitle")}</SheetTitle>
            </SheetHeader>
            <WishForm key={draft.id ?? "new"} initial={draft} onCancel={onClose} onSaved={onSaved} />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function WishForm({ initial, onCancel, onSaved }: { initial: Draft; onCancel: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const quantity = Number(form.quantity.replace(",", "."));
    if (!form.title.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error(t("portal.wishlist.failed"));
      return;
    }
    setSaving(true);
    const payload = { category: form.category, title: form.title, description: form.description, quantity, unit: form.unit };
    const isRevision = Boolean(form.id) && form.status !== "draft";
    const result = isRevision
      ? await reviseWish({ ...payload, id: form.id! })
      : await saveWishItem({ ...payload, id: form.id });
    setSaving(false);
    if (result.ok) onSaved();
    else toast.error(result.error === "wrong_state" ? t("portal.wishlist.wrongState") : t("portal.wishlist.failed"));
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-app-sm font-semibold">{t("portal.wishlist.fieldCategory")}</legend>
        <div className="flex flex-wrap gap-2">
          {WISH_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={form.category === c}
              onClick={() => set("category", c)}
              className={cn(
                "min-h-11 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors",
                form.category === c ? "bg-success text-white ring-success" : "bg-card ring-foreground/15 hover:ring-foreground/30",
              )}
            >
              {t(`portal.wishlist.categories.${c}` as TranslationKey)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="wish-title">{t("portal.wishlist.fieldTitle")}</Label>
        <Input
          id="wish-title"
          value={form.title}
          maxLength={120}
          placeholder={t("portal.wishlist.fieldTitleHint")}
          onChange={(e) => set("title", e.target.value)}
          className="h-12 !text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="wish-qty">{t("portal.wishlist.fieldQuantity")}</Label>
          <Input id="wish-qty" inputMode="decimal" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className="h-12 !text-base" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="wish-unit">{t("portal.wishlist.fieldUnit")}</Label>
          <Input
            id="wish-unit"
            value={form.unit}
            maxLength={20}
            placeholder={t("portal.wishlist.fieldUnitHint")}
            onChange={(e) => set("unit", e.target.value)}
            className="h-12 !text-base"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="wish-desc">{t("portal.wishlist.fieldDescription")}</Label>
        <Textarea id="wish-desc" value={form.description} maxLength={1000} onChange={(e) => set("description", e.target.value)} className="!min-h-24 !text-base" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="success" size="cta" className="flex-1" disabled={saving}>
          {t("portal.wishlist.save")}
        </Button>
        <Button type="button" variant="outline" size="cta" onClick={onCancel}>
          {t("portal.wishlist.cancel")}
        </Button>
      </div>
    </form>
  );
}
