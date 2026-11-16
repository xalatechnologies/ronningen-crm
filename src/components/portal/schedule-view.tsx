"use client";

import { CalendarClock, CheckCheck, Clock3, PencilLine, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { BotanicalSprig } from "@/components/brand/botanical";
import { ScheduleTimeline } from "@/components/portal/schedule-timeline";
import { PORTAL_SHEET } from "@/components/portal/sheet-style";
import { Button } from "@/components/ui/button";
import { SCHEDULE_EMOJIS, splitEmoji, withEmoji } from "@/lib/portal/schedule-emoji";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import { deleteScheduleItem, saveScheduleItem, setScheduleVisibleToGuests, shareSchedule, type ScheduleResult } from "@/lib/portal/schedule-actions";
import { canShare, DURATION_PRESETS, endTime, type ScheduleEntry, type ShareState } from "@/lib/portal/schedule-rules";
import { cn } from "@/lib/utils";

type Draft = { id?: string; startTime: string; durationMin: string; title: string; responsible: string; note: string };
const emptyDraft: Draft = { startTime: "14:00", durationMin: "", title: "", responsible: "", note: "" };

export type LatestShare = { version: number; sharedAt: string; acknowledgedAt: string | null; staffNote: string | null } | null;

export function ScheduleView({
  entries,
  state,
  latest,
  orgName,
  guestSharing,
}: {
  entries: ScheduleEntry[];
  state: ShareState;
  latest: LatestShare;
  orgName: string;
  guestSharing: { hasInvite: boolean; enabled: boolean };
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [sheet, setSheet] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [guestsBusy, setGuestsBusy] = useState(false);

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  async function share() {
    setSharing(true);
    const result = await shareSchedule();
    setSharing(false);
    setConfirming(false);
    if (result.ok) toast.success(t("portal.schedule.shared"));
    else toast.error(t("portal.schedule.failed"));
    router.refresh();
  }

  async function toggleGuests() {
    setGuestsBusy(true);
    const result = await setScheduleVisibleToGuests(!guestSharing.enabled);
    setGuestsBusy(false);
    if (!result.ok) toast.error(t("portal.schedule.guestsFailed"));
    router.refresh();
  }

  const last = entries[entries.length - 1];
  const summary = last
    ? t("portal.schedule.summary", {
        from: entries[0].startTime,
        to: endTime(last.startTime, last.durationMin) ?? last.startTime,
      })
    : "";
  const StatusIcon = state.kind === "changed" ? PencilLine : state.kind === "shared" && state.acknowledged ? CheckCheck : Clock3;

  const statusText =
    state.kind === "never"
      ? t("portal.schedule.statusNever")
      : state.kind === "changed"
        ? t("portal.schedule.statusChanged", { version: state.version })
        : state.kind === "shared"
          ? state.acknowledged
            ? t("portal.schedule.statusAck", { version: state.version })
            : t("portal.schedule.statusWaiting", { version: state.version })
          : null;

  return (
    <div className="flex flex-col gap-6">
      {statusText ? (
        <section
          className={
            state.kind === "changed"
              ? "relative flex flex-col gap-1 overflow-hidden rounded-3xl bg-amber-500/10 p-5 ring-1 ring-gold/60"
              : state.kind === "shared" && state.acknowledged
                ? "relative flex flex-col gap-1 overflow-hidden rounded-3xl bg-primary-soft p-5 ring-1 ring-gold/50"
                : "relative flex flex-col gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#5e1f3d] p-5 text-primary-foreground shadow-rn-hero-success ring-1 ring-gold/60"
          }
        >
          {state.kind === "never" || (state.kind === "shared" && !state.acknowledged) ? <BotanicalSprig className="absolute -right-2 -top-2 h-28 w-20 text-primary-foreground/20" /> : null}
          <p className="relative flex items-start gap-2.5 font-serif text-lg font-semibold">
            <StatusIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
            {statusText}
          </p>
          {latest ? <p className="pl-[1.875rem] text-app-xs text-muted-foreground">{fmt.format(new Date(latest.sharedAt))}</p> : null}
          {latest?.staffNote && state.kind === "shared" ? <p className="pl-[1.875rem] text-app-sm">{t("portal.schedule.ackNote", { note: latest.staffNote })}</p> : null}
        </section>
      ) : null}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-12 text-center shadow-rn-card ring-1 ring-gold/40">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-success ring-1 ring-gold/50">
            <CalendarClock className="size-6" aria-hidden />
          </span>
          <p className="max-w-xs text-balance text-app-base text-muted-foreground">{t("portal.schedule.empty")}</p>
          <Button type="button" variant="success" size="cta" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.schedule.emptyCta")}
          </Button>
        </div>
      ) : (
        <>
          <p className="-mb-2 px-1 text-app-sm font-medium text-muted-foreground">{summary}</p>
          <ScheduleTimeline
            entries={entries}
            onSelect={(index) => {
              const e = entries[index];
              setSheet({
                id: e.id,
                startTime: e.startTime,
                durationMin: e.durationMin ? String(e.durationMin) : "",
                title: e.title,
                responsible: e.responsible ?? "",
                note: e.note ?? "",
              });
            }}
          />
          <Button type="button" variant="outline" size="cta" className="hidden w-full rounded-full border-gold/60 sm:inline-flex" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.schedule.add")}
          </Button>
        </>
      )}

      <section className="flex items-start gap-4 rounded-3xl bg-card p-5 shadow-rn-card ring-1 ring-gold/40">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-success ring-1 ring-gold/50">
          <Users className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-semibold">{t("portal.schedule.guestsTitle")}</p>
          <p className="text-app-sm text-muted-foreground">
            {!guestSharing.hasInvite
              ? t("portal.schedule.guestsNoInvite")
              : guestSharing.enabled
                ? t("portal.schedule.guestsOn")
                : t("portal.schedule.guestsOff")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={guestSharing.enabled}
          aria-label={t("portal.schedule.guestsTitle")}
          disabled={!guestSharing.hasInvite || guestsBusy}
          onClick={() => void toggleGuests()}
          className="relative mt-1 h-7 w-12 shrink-0 rounded-full bg-foreground/20 transition-colors disabled:opacity-40 aria-checked:bg-success"
        >
          <span className="absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform" style={{ transform: guestSharing.enabled ? "translateX(1.25rem)" : undefined }} />
        </button>
      </section>

      {canShare(state) ? (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-gold/40 bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:rounded-3xl sm:border">
          <Button type="button" variant="success" size="cta" className="w-full rounded-full bg-gradient-to-r from-primary to-[#5e1f3d]" onClick={() => setConfirming(true)}>
            {t("portal.schedule.share")}
          </Button>
        </div>
      ) : null}

      {entries.length > 0 ? (
        <button
          type="button"
          onClick={() => setSheet({ ...emptyDraft })}
          aria-label={t("portal.schedule.add")}
          className={cn(
            "fixed right-4 z-20 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#5e1f3d] text-primary-foreground shadow-rn-hero-success ring-2 ring-gold/70 transition-transform active:scale-95 sm:hidden",
            canShare(state) ? "bottom-[calc(8.25rem+env(safe-area-inset-bottom))]" : "bottom-[calc(5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <Plus className="size-7" aria-hidden />
        </button>
      ) : null}

      <Sheet open={sheet !== null} onOpenChange={(open) => (open ? undefined : setSheet(null))}>
        <SheetContent side="bottom" className={cn(PORTAL_SHEET, "max-h-[92dvh] overflow-y-auto")}>
          {sheet ? (
            <>
              <SheetHeader>
                <SheetTitle>{sheet.id ? t("portal.schedule.editTitle") : t("portal.schedule.addTitle")}</SheetTitle>
              </SheetHeader>
              <ScheduleForm
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

      <Sheet open={confirming} onOpenChange={setConfirming}>
        <SheetContent side="bottom" className={PORTAL_SHEET}>
          <SheetHeader>
            <SheetTitle>{t("portal.schedule.shareTitle")}</SheetTitle>
          </SheetHeader>
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
            <p className="text-muted-foreground">{t("portal.schedule.shareBody", { org: orgName, count: entries.length })}</p>
            <div className="flex gap-2">
              <Button type="button" variant="success" size="cta" className="flex-1" disabled={sharing} onClick={() => void share()}>
                {t("portal.schedule.shareConfirm")}
              </Button>
              <Button type="button" variant="outline" size="cta" onClick={() => setConfirming(false)}>
                {t("portal.schedule.cancel")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ScheduleForm({ initial, onCancel, onDone }: { initial: Draft; onCancel: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }));
  const picked = splitEmoji(form.title);
  const pickEmoji = (emoji: string) => set("title", withEmoji(emoji === picked.emoji ? "" : emoji, picked.text));

  async function settle(action: () => Promise<ScheduleResult>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) onDone();
    else toast.error(result.error === "limit" ? t("portal.schedule.tooMany") : t("portal.schedule.failed"));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void settle(() =>
      saveScheduleItem({
        id: form.id,
        startTime: form.startTime,
        durationMin: form.durationMin ? Number(form.durationMin) : null,
        title: form.title,
        responsible: form.responsible,
        note: form.note,
      }),
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sch-time">{t("portal.schedule.fieldTime")}</Label>
          <Input id="sch-time" type="time" required value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className="h-12 !text-base" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sch-dur">{t("portal.schedule.fieldDuration")}</Label>
          <select
            id="sch-dur"
            value={form.durationMin}
            onChange={(e) => set("durationMin", e.target.value)}
            className="h-12 rounded-[length:var(--app-radius)] border border-input bg-transparent px-3 text-base"
          >
            <option value="">{t("portal.schedule.noDuration")}</option>
            {DURATION_PRESETS.map((m) => (
              <option key={m} value={m}>
                {t("portal.schedule.minutes", { count: m })}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sch-title">{t("portal.schedule.fieldTitle")}</Label>
        <Input
          id="sch-title"
          required
          value={form.title}
          maxLength={120}
          placeholder={t("portal.schedule.fieldTitleHint")}
          onChange={(e) => set("title", e.target.value)}
          className="h-12 !text-base"
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Emoji">
        {SCHEDULE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-pressed={emoji === picked.emoji}
            onClick={() => pickEmoji(emoji)}
            className="flex size-10 items-center justify-center rounded-full text-xl leading-none ring-1 ring-gold/30 transition-transform active:scale-90 aria-pressed:bg-primary-soft aria-pressed:ring-2 aria-pressed:ring-primary"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sch-resp">{t("portal.schedule.fieldResponsible")}</Label>
        <Input id="sch-resp" value={form.responsible} maxLength={80} onChange={(e) => set("responsible", e.target.value)} className="h-12 !text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sch-note">{t("portal.schedule.fieldNote")}</Label>
        <Textarea id="sch-note" value={form.note} maxLength={500} onChange={(e) => set("note", e.target.value)} className="!min-h-20 !text-base" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="success" size="cta" className="flex-1" disabled={busy}>
          {t("portal.schedule.save")}
        </Button>
        <Button type="button" variant="outline" size="cta" onClick={onCancel}>
          {t("portal.schedule.cancel")}
        </Button>
      </div>
      {form.id ? (
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void settle(() => deleteScheduleItem(form.id!))}>
          {t("portal.schedule.delete")}
        </Button>
      ) : null}
    </form>
  );
}
