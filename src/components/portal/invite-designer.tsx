"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { InviteCard, type InviteCardLabels } from "@/components/portal/invite-card";
import { Bloom, flowerColors } from "@/components/portal/invite-flowers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { saveInviteDesign } from "@/lib/portal/invite-actions";
import {
  containsLink,
  FLOWER_STYLES,
  FLOWER_TONES,
  FLOWER_TYPES,
  FONT_KEYS,
  missingForPublish,
  PALETTE_KEYS,
  PALETTES,
  TEMPLATES,
  type InviteDesign,
} from "@/lib/portal/invite-rules";
import { cn } from "@/lib/utils";

type Field = "headline" | "message" | "eventDateText" | "eventTimeText" | "placeText" | "dressCode";

export function InviteDesigner({ initial, venueName }: { initial: InviteDesign; venueName: string }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [d, setD] = useState<InviteDesign>(initial);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof InviteDesign>(key: K, value: InviteDesign[K]) => setD((s) => ({ ...s, [key]: value }));
  const linkInText = (["headline", "message", "eventDateText", "eventTimeText", "placeText", "dressCode"] as Field[]).some((f) => containsLink(d[f]));
  const published = d.status === "published";

  const labels = useMemo(
    () => ({
      invited: t("portal.invitation.cardInvited"),
      when: t("portal.invitation.cardWhen"),
      where: t("portal.invitation.cardWhere"),
      dress: t("portal.invitation.cardDress"),
      rsvpBy: d.rsvpDeadline
        ? t("portal.invitation.cardRsvpBy", {
            date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d.rsvpDeadline}T00:00:00Z`)),
          })
        : "",
      hostedAt: venueName ? t("portal.invitation.cardHostedAt", { venue: venueName }) : "",
    }),
    [d.rsvpDeadline, locale, t, venueName],
  );

  const tileLabels: InviteCardLabels = useMemo(() => ({ ...labels, rsvpBy: "", hostedAt: "" }), [labels]);

  async function save(mode: "draft" | "publish" | "unpublish") {
    if (mode === "publish") {
      const missing = missingForPublish(d);
      if (missing.length > 0) {
        toast.error(missing.includes("headline") ? t("portal.invitation.needHeadline") : t("portal.invitation.needDate"));
        return;
      }
    }
    setBusy(true);
    const result = await saveInviteDesign(
      {
        templateKey: d.templateKey,
        paletteKey: d.paletteKey,
        fontKey: d.fontKey,
        flowerStyle: d.flowerStyle,
        flowerType: d.flowerType,
        flowerTone: d.flowerTone,
        headline: d.headline,
        message: d.message,
        eventDateText: d.eventDateText,
        eventTimeText: d.eventTimeText,
        placeText: d.placeText,
        dressCode: d.dressCode,
        rsvpDeadline: d.rsvpDeadline,
      },
      mode,
    );
    setBusy(false);
    if (result.ok) {
      setD((s) => ({ ...s, status: result.status }));
      toast.success(mode === "publish" ? t("portal.invitation.publishedToast") : t("portal.invitation.saved"));
      router.refresh();
    } else {
      toast.error(t("portal.invitation.failed"));
    }
  }

  const textField = (field: Field, label: string, opts: { max: number; hint?: string; multiline?: boolean }) => {
    const value = d[field];
    const bad = containsLink(value);
    const id = `inv-${field}`;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={id}>{label}</Label>
          <span className="text-app-xs text-muted-foreground tabular-nums">{t("portal.invitation.counter", { count: value.length, max: opts.max })}</span>
        </div>
        {opts.multiline ? (
          <Textarea id={id} value={value} maxLength={opts.max} placeholder={opts.hint} aria-invalid={bad} onChange={(e) => set(field, e.target.value)} className="!min-h-28 !text-base" />
        ) : (
          <Input id={id} value={value} maxLength={opts.max} placeholder={opts.hint} aria-invalid={bad} onChange={(e) => set(field, e.target.value)} className="h-12 !text-base" />
        )}
        {bad ? <p className="text-app-sm font-medium text-destructive">{t("portal.invitation.noLinks")}</p> : null}
      </div>
    );
  };

  const group = (step: number, title: string, help: string, children: ReactNode) => (
    <fieldset className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-rn-card ring-1 ring-gold/40">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/25 font-serif text-base font-semibold text-primary ring-1 ring-gold/50">
          {step}
        </span>
        <div>
          <h2 className="font-serif text-xl font-semibold leading-tight">{title}</h2>
          <p className="text-app-sm text-muted-foreground">{help}</p>
        </div>
      </div>
      {children}
    </fieldset>
  );

  // A tiny live card: what this choice would look like with the rest of the design as it is now.
  const sample = (over: Partial<InviteDesign>): InviteDesign => ({
    ...d,
    headline: d.headline.trim() || t("portal.invitation.sampleHeadline"),
    eventDateText: d.eventDateText.trim() || t("portal.invitation.sampleDate"),
    message: "",
    dressCode: "",
    eventTimeText: "",
    ...over,
  });
  const tile = (active: boolean, onClick: () => void, label: string, over: Partial<InviteDesign>) => (
    <button
      key={label}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-2xl p-1.5 text-center ring-1 transition-all active:scale-[0.98]",
        active ? "bg-primary/8 ring-2 ring-primary" : "bg-background ring-gold/40 hover:ring-gold",
      )}
    >
      <span aria-hidden className="pointer-events-none relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-muted/40">
        <span className="absolute left-0 top-0 block w-[333%] origin-top-left scale-[0.3]">
          <InviteCard design={sample(over)} labels={tileLabels} />
        </span>
      </span>
      <span className={cn("px-1 pb-1 text-app-sm font-semibold", active && "text-primary")}>{label}</span>
    </button>
  );

  const chip = (active: boolean, onClick: () => void, label: string, icon?: ReactNode) => (
    <button
      key={label}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors",
        active ? "bg-primary text-primary-foreground ring-gold/60" : "bg-card ring-gold/40 hover:ring-gold",
      )}
    >
      {icon}
      {label}
    </button>
  );
  const bloomColors = flowerColors(d.paletteKey, d.flowerTone);

  const editor = (
    <div className="flex flex-col gap-5">
      {group(
        1,
        t("portal.invitation.sectionTemplate"),
        t("portal.invitation.sectionTemplateHelp"),
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TEMPLATES.map((k) => tile(d.templateKey === k, () => set("templateKey", k), t(`portal.invitation.templates.${k}` as TranslationKey), { templateKey: k }))}
        </div>,
      )}
      {group(
        2,
        t("portal.invitation.sectionFlowers"),
        t("portal.invitation.sectionFlowersHelp"),
        <>
          <div className="flex flex-col gap-2">
            <span className="text-app-sm font-semibold">{t("portal.invitation.flowerStyle")}</span>
            <div className="grid grid-cols-3 gap-3">
              {FLOWER_STYLES.map((k) => tile(d.flowerStyle === k, () => set("flowerStyle", k), t(`portal.invitation.flowerStyles.${k}` as TranslationKey), { flowerStyle: k }))}
            </div>
          </div>
          {d.flowerStyle !== "none" ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-app-sm font-semibold">{t("portal.invitation.flowerType")}</span>
                <div className="flex flex-wrap gap-2">
                  {FLOWER_TYPES.map((k) =>
                    chip(
                      d.flowerType === k,
                      () => set("flowerType", k),
                      t(`portal.invitation.flowerTypes.${k}` as TranslationKey),
                      <Bloom type={k} colors={bloomColors} size="1.75rem" style={{ background: "transparent" }} />,
                    ),
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-app-sm font-semibold">{t("portal.invitation.flowerTone")}</span>
                <div className="flex flex-wrap gap-3">
                  {FLOWER_TONES.map((k) => {
                    const label = t(`portal.invitation.flowerTones.${k}` as TranslationKey);
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={d.flowerTone === k}
                        aria-label={label}
                        title={label}
                        onClick={() => set("flowerTone", k)}
                        className={cn("size-11 rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform active:scale-95", d.flowerTone === k ? "ring-primary" : "ring-gold/40")}
                        style={{ background: flowerColors(d.paletteKey, k).petal }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </>,
      )}
      {group(
        3,
        t("portal.invitation.sectionColors"),
        t("portal.invitation.sectionColorsHelp"),
        <>
          <div className="flex flex-col gap-2">
            <span className="text-app-sm font-semibold">{t("portal.invitation.palette")}</span>
            <div className="flex flex-wrap gap-3">
              {PALETTE_KEYS.map((k) => {
                const label = t(`portal.invitation.palettes.${k}` as TranslationKey);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={d.paletteKey === k}
                    aria-label={label}
                    title={label}
                    onClick={() => set("paletteKey", k)}
                    className={cn("relative size-11 rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform active:scale-95", d.paletteKey === k ? "ring-primary" : "ring-gold/40")}
                    style={{ background: `linear-gradient(135deg, ${PALETTES[k].bg} 50%, ${PALETTES[k].accent} 50%)` }}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-app-sm font-semibold">{t("portal.invitation.font")}</span>
            <div className="flex flex-wrap gap-2">
              {FONT_KEYS.map((k) => chip(d.fontKey === k, () => set("fontKey", k), t(`portal.invitation.fonts.${k}` as TranslationKey)))}
            </div>
          </div>
        </>,
      )}
      {group(
        4,
        t("portal.invitation.sectionText"),
        t("portal.invitation.sectionTextHelp"),
        <>
          {textField("headline", t("portal.invitation.fieldHeadline"), { max: 80, hint: t("portal.invitation.fieldHeadlineHint") })}
          {textField("eventDateText", t("portal.invitation.fieldDate"), { max: 60 })}
          {textField("eventTimeText", t("portal.invitation.fieldTime"), { max: 40, hint: t("portal.invitation.fieldTimeHint") })}
          {textField("placeText", t("portal.invitation.fieldPlace"), { max: 120 })}
          {textField("dressCode", t("portal.invitation.fieldDress"), { max: 60, hint: t("portal.invitation.fieldDressHint") })}
          {textField("message", t("portal.invitation.fieldMessage"), { max: 600, hint: t("portal.invitation.fieldMessageHint"), multiline: true })}
          <div className="flex flex-col gap-2">
            <Label htmlFor="inv-deadline">{t("portal.invitation.fieldDeadline")}</Label>
            <Input id="inv-deadline" type="date" value={d.rsvpDeadline ?? ""} onChange={(e) => set("rsvpDeadline", e.target.value || null)} className="h-12 !text-base" />
          </div>
        </>,
      )}
    </div>
  );

  const preview = (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="rounded-3xl bg-card p-3 shadow-rn-card ring-1 ring-gold/40">
        <p className="px-2 pb-2 text-center text-app-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("portal.invitation.previewTitle")}</p>
        <div className="overflow-hidden rounded-2xl shadow-lg">
          <InviteCard design={d} labels={labels} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-app-xs font-semibold",
            published ? "bg-success/15 text-success dark:!text-white" : "bg-foreground/8 text-muted-foreground",
          )}
        >
          {published ? t("portal.invitation.statusPublished") : t("portal.invitation.statusDraft")}
        </span>
        <div role="group" className="flex rounded-full bg-card p-1 ring-1 ring-gold/40 lg:hidden">
          {(["edit", "preview"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn("min-h-10 rounded-full px-4 text-app-sm font-semibold", view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
            >
              {v === "edit" ? t("portal.invitation.tabEdit") : t("portal.invitation.tabPreview")}
            </button>
          ))}
        </div>
      </div>
      {published ? <p className="text-app-sm text-muted-foreground">{t("portal.invitation.publishedHint")}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className={cn(view === "preview" && "hidden lg:block")}>{editor}</div>
        <div className={cn("lg:sticky lg:top-20 lg:self-start", view === "edit" && "hidden lg:block")}>{preview}</div>
      </div>

      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex gap-2 border-t border-gold/40 bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:rounded-2xl sm:border">
        {published ? (
          <>
            <Button type="button" variant="success" size="cta" className="flex-1" disabled={busy || linkInText} onClick={() => void save("publish")}>
              {t("portal.invitation.saveChanges")}
            </Button>
            <Button type="button" variant="outline" size="cta" disabled={busy} onClick={() => void save("unpublish")}>
              {t("portal.invitation.unpublish")}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" size="cta" className="flex-1" disabled={busy || linkInText} onClick={() => void save("draft")}>
              {t("portal.invitation.saveDraft")}
            </Button>
            <Button type="button" variant="success" size="cta" className="flex-1" disabled={busy || linkInText} onClick={() => void save("publish")}>
              {t("portal.invitation.publish")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
