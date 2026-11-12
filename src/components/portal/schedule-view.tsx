"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ScheduleTimeline } from "@/components/portal/schedule-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import { deleteScheduleItem, saveScheduleItem, shareSchedule, type ScheduleResult } from "@/lib/portal/schedule-actions";
import { canShare, DURATION_PRESETS, type ScheduleEntry, type ShareState } from "@/lib/portal/schedule-rules";

type Draft = { id?: string; startTime: string; durationMin: string; title: string; responsible: string; note: string };
const emptyDraft: Draft = { startTime: "14:00", durationMin: "", title: "", responsible: "", note: "" };

export type LatestShare = { version: number; sharedAt: string; acknowledgedAt: string | null; staffNote: string | null } | null;

export function ScheduleView({
  entries,
  state,
  latest,
  orgName,
}: {
  entries: ScheduleEntry[];
  state: ShareState;
  latest: LatestShare;
  orgName: string;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [sheet, setSheet] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sharing, setSharing] = useState(false);

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
              ? "flex flex-col gap-1 rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30"
              : state.kind === "shared" && state.acknowledged
                ? "flex flex-col gap-1 rounded-2xl bg-success/10 p-4 ring-1 ring-success/25"
                : "flex flex-col gap-1 rounded-2xl bg-card p-4 ring-1 ring-foreground/8"
          }
        >
          <p className="font-semibold">{statusText}</p>
          {latest ? <p className="text-app-xs text-muted-foreground">{fmt.format(new Date(latest.sharedAt))}</p> : null}
          {latest?.staffNote && state.kind === "shared" ? <p className="text-app-sm">{t("portal.schedule.ackNote", { note: latest.staffNote })}</p> : null}
        </section>
      ) : null}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-foreground/8">
          <p className="text-app-base text-muted-foreground">{t("portal.schedule.empty")}</p>
          <Button type="button" variant="success" size="cta" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.schedule.emptyCta")}
          </Button>
        </div>
      ) : (
        <>
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
          <Button type="button" variant="outline" size="cta" className="w-full" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.schedule.add")}
          </Button>
        </>
      )}

      {canShare(state) ? (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-foreground/8 bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:rounded-2xl sm:border">
          <Button type="button" variant="success" size="cta" className="w-full" onClick={() => setConfirming(true)}>
            {t("portal.schedule.share")}
          </Button>
        </div>
      ) : null}

      <Sheet open={sheet !== null} onOpenChange={(open) => (open ? undefined : setSheet(null))}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
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
        <SheetContent side="bottom">
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
