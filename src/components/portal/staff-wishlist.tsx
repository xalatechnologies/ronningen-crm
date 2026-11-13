"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useNok } from "@/components/portal/use-nok";
import { WishStatusChip } from "@/components/portal/wish-status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { acceptCounter, markWishUnavailable, quoteWish, rejectCounter, type WishResult } from "@/lib/portal/wishlist-actions";
import { approvedMixedVat, approvedTotalNok, parsePriceInput, type WishItemView } from "@/lib/portal/wishlist-rules";

/** The venue's view of a booking's wishlist: price each wish, answer counter-offers. Drafts are never shown. */
export function StaffWishlist({ bookingId, items }: { bookingId: string; items: WishItemView[] }) {
  const { t } = useTranslation();
  const nok = useNok();
  const visible = items.filter((i) => i.status !== "draft");
  const approved = approvedTotalNok(visible);
  const forYou = visible.filter((i) => i.status === "requested" || i.status === "countered").length;
  const forCustomer = visible.filter((i) => i.status === "quoted").length;
  // What needs the venue first.
  const ordered = [...visible].sort((x, y) => Number(y.status === "requested" || y.status === "countered") - Number(x.status === "requested" || x.status === "countered"));

  if (visible.length === 0) {
    return <p className="rounded-2xl bg-card px-6 py-10 text-center text-muted-foreground ring-1 ring-foreground/8">{t("portal.staffWishes.empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: t("portal.staffWishes.statYou"), value: String(forYou), alert: forYou > 0 },
          { label: t("portal.staffWishes.statCustomer"), value: String(forCustomer), alert: false },
          { label: t("portal.staffWishes.statApproved"), value: nok(approved), alert: false },
        ].map((stat) => (
          <li key={stat.label} className="flex flex-col justify-between gap-1 rounded-2xl bg-card p-3 ring-1 ring-foreground/8 sm:p-4">
            <span className="text-app-xs leading-tight text-muted-foreground sm:text-app-sm">{stat.label}</span>
            <span className={`font-heading text-lg font-bold tabular-nums sm:text-2xl ${stat.alert ? "text-success" : ""}`}>{stat.value}</span>
          </li>
        ))}
      </ul>
      {approved > 0 ? (
        <p className="px-1 text-app-sm text-muted-foreground">
          {t("portal.staffWishes.approvedNote")}
          {approvedMixedVat(visible) ? ` ${t("portal.wishlist.mixedVat")}` : ""}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {ordered.map((item) => (
          <li key={`${item.id}:${item.revision}:${item.status}`}>
            <StaffWishCard bookingId={bookingId} item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StaffWishCard({ bookingId, item }: { bookingId: string; item: WishItemView }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const nok = useNok();
  const [price, setPrice] = useState(item.quote ? String(item.quote.unitPriceNok) : "");
  const [vat, setVat] = useState(item.quote?.vatIncluded ?? true);
  const [validUntil, setValidUntil] = useState(item.quote?.validUntil ?? "");
  const [note, setNote] = useState(item.quote?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [priceError, setPriceError] = useState(false);

  async function run(action: () => Promise<WishResult>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) toast.success(t("portal.staffWishes.saved"));
    else toast.error(t("portal.staffWishes.failed"));
    router.refresh();
  }

  function submitQuote(event: FormEvent) {
    event.preventDefault();
    const parsed = parsePriceInput(price);
    if (parsed === null) return setPriceError(true);
    setPriceError(false);
    void run(() => quoteWish({ bookingId, itemId: item.id, unitPriceNok: parsed, vatIncluded: vat, note, validUntil: validUntil || null }));
  }

  const open = item.status === "requested" || item.status === "countered" || item.status === "quoted";

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="break-words font-semibold">{item.title}</h3>
          <p className="text-app-sm text-muted-foreground">
            {t(`portal.wishlist.categories.${item.category}` as TranslationKey)} · {item.quantity.toLocaleString(locale)} {item.unit ?? ""}
          </p>
        </div>
        <WishStatusChip status={item.status} />
      </header>

      {item.description ? <p className="whitespace-pre-wrap break-words text-app-sm text-muted-foreground">{item.description}</p> : null}

      {item.status === "countered" && item.openCounter ? (
        <div className="flex flex-col gap-2 rounded-xl bg-amber-500/10 p-3">
          <p className="font-semibold">{t("portal.staffWishes.customerCounter", { price: nok(item.openCounter.proposedUnitPriceNok) })}</p>
          {item.openCounter.note ? <p className="text-app-sm">{t("portal.staffWishes.customerCounterNote", { note: item.openCounter.note })}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="success" size="sm" disabled={busy} onClick={() => void run(() => acceptCounter({ bookingId, itemId: item.id }))}>
              {t("portal.staffWishes.accept")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void run(() => rejectCounter({ bookingId, itemId: item.id }))}>
              {t("portal.staffWishes.rejectCounter")}
            </Button>
          </div>
        </div>
      ) : null}

      {item.status === "quoted" && item.quote ? (
        <p className="text-app-sm text-muted-foreground">{t("portal.staffWishes.waitingCustomer", { total: nok(item.quote.totalNok) })}</p>
      ) : null}

      {item.status === "approved" && item.quote ? (
        <p className="font-heading text-lg font-bold">
          {nok(item.quote.totalNok)}{" "}
          <span className="text-app-sm font-medium text-muted-foreground">{item.quote.vatIncluded ? t("portal.wishlist.vatIncluded") : t("portal.wishlist.vatExcluded")}</span>
        </p>
      ) : null}

      {open ? (
        <form onSubmit={submitQuote} className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`q-price-${item.id}`}>{t("portal.staffWishes.priceLabel")}</Label>
              <Input id={`q-price-${item.id}`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={priceError} className="h-12 !text-base" />
              {priceError ? <p className="text-app-sm font-medium text-destructive">{t("portal.staffWishes.invalidPrice")}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`q-valid-${item.id}`}>{t("portal.staffWishes.validUntil")}</Label>
              <Input id={`q-valid-${item.id}`} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-12 !text-base" />
            </div>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-app-sm font-medium">
            <input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} className="size-5" />
            {t("portal.staffWishes.vatIncluded")}
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`q-note-${item.id}`}>{t("portal.staffWishes.note")}</Label>
            <Textarea id={`q-note-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="!min-h-20 !text-base" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="success" disabled={busy}>
              {item.quote ? t("portal.staffWishes.requote") : t("portal.staffWishes.sendQuote")}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void run(() => markWishUnavailable({ bookingId, itemId: item.id }))}>
              {t("portal.staffWishes.cannot")}
            </Button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
