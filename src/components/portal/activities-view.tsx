"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import { deleteActivity, saveActivity, type ActivityResult } from "@/lib/portal/activity-actions";
import { canAnswer, formatOslo, isoToOsloLocal, type ActivityAudience } from "@/lib/portal/activity-rules";
import type { CustomerActivity } from "@/lib/portal/activities";
import { containsLink } from "@/lib/portal/invite-rules";
import { cn } from "@/lib/utils";

type Guest = { id: string; name: string };
type Draft = {
  id?: string;
  title: string;
  description: string;
  location: string;
  startsAtLocal: string;
  endsAtLocal: string;
  capacity: string;
  audience: ActivityAudience;
  guestIds: string[];
};
const emptyDraft: Draft = { title: "", description: "", location: "", startsAtLocal: "", endsAtLocal: "", capacity: "", audience: "all", guestIds: [] };

export function ActivitiesView({ items, guests }: { items: CustomerActivity[]; guests: Guest[] }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [sheet, setSheet] = useState<Draft | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const names = useMemo(() => new Map(guests.map((g) => [g.id, g.name])), [guests]);

  const when = (a: CustomerActivity["activity"]) => {
    const start = formatOslo(a.startsAt, locale);
    if (!a.endsAt) return start;
    const sameDay = isoToOsloLocal(a.startsAt).slice(0, 10) === isoToOsloLocal(a.endsAt).slice(0, 10);
    return `${start} – ${sameDay ? isoToOsloLocal(a.endsAt).slice(11) : formatOslo(a.endsAt, locale)}`;
  };

  function edit(item: CustomerActivity) {
    const a = item.activity;
    setSheet({
      id: a.id,
      title: a.title,
      description: a.description,
      location: a.location,
      startsAtLocal: isoToOsloLocal(a.startsAt),
      endsAtLocal: a.endsAt ? isoToOsloLocal(a.endsAt) : "",
      capacity: a.capacity ? String(a.capacity) : "",
      audience: a.audience,
      guestIds: a.audience === "selected" ? item.answers.map((x) => x.guestId) : [],
    });
  }

  const group = (item: CustomerActivity, kind: "yes" | "no" | "maybe" | "none") => {
    const invited = item.activity.audience === "all" ? guests.map((g) => g.id) : item.answers.map((a) => a.guestId);
    const answered = new Map(item.answers.map((a) => [a.guestId, a]));
    return invited
      .filter((id) => {
        const r = answered.get(id)?.response ?? null;
        return kind === "none" ? r === null : r === kind;
      })
      .map((id) => ({ id, name: names.get(id) ?? "", people: answered.get(id)?.people ?? null }));
  };

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-foreground/8">
          <p className="text-app-base text-muted-foreground">{t("portal.activities.empty")}</p>
          <Button type="button" variant="success" size="cta" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.activities.emptyCta")}
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const a = item.activity;
              const c = item.counts;
              const ended = !canAnswer(a);
              const isOpen = open === a.id;
              return (
                <li key={a.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
                  <button type="button" onClick={() => edit(item)} className="flex flex-col gap-1 text-left">
                    <span className="flex items-start justify-between gap-3">
                      <span className="break-words font-semibold">{a.title}</span>
                      {ended ? <span className="shrink-0 rounded-full bg-foreground/8 px-2.5 py-1 text-app-xs font-semibold text-muted-foreground">{t("portal.activities.ended")}</span> : null}
                    </span>
                    <span className="text-app-sm text-muted-foreground">{when(a)}</span>
                    {a.location ? <span className="text-app-sm text-muted-foreground">{a.location}</span> : null}
                  </button>
                  <ul className="flex flex-wrap gap-2 text-app-xs font-semibold">
                    <li className="rounded-full bg-success/15 px-3 py-1">{t("portal.activities.countYes", { people: c.yesPeople })}</li>
                    <li className="rounded-full bg-destructive/12 px-3 py-1">{t("portal.activities.countNo", { count: c.no })}</li>
                    <li className="rounded-full bg-sky-500/15 px-3 py-1">{t("portal.activities.countMaybe", { count: c.maybe })}</li>
                    <li className="rounded-full bg-amber-500/15 px-3 py-1">{t("portal.activities.countNoAnswer", { count: c.noAnswer })}</li>
                  </ul>
                  {a.capacity ? (
                    <p className="text-app-sm text-muted-foreground">
                      {c.yesPeople >= a.capacity ? t("portal.activities.spotsFull", { capacity: a.capacity }) : t("portal.activities.spots", { taken: c.yesPeople, capacity: a.capacity })}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : a.id)}
                    className="flex min-h-11 w-fit items-center gap-1 text-app-sm font-semibold text-success dark:!text-white"
                  >
                    {isOpen ? t("portal.activities.hideAnswers") : t("portal.activities.showAnswers")}
                    <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} aria-hidden />
                  </button>
                  {isOpen ? (
                    <div className="flex flex-col gap-3 text-app-sm">
                      {(
                        [
                          ["yes", t("portal.activities.groupYes")],
                          ["maybe", t("portal.activities.groupMaybe")],
                          ["no", t("portal.activities.groupNo")],
                          ["none", t("portal.activities.groupNoAnswer")],
                        ] as const
                      ).map(([kind, label]) => {
                        const people = group(item, kind);
                        return (
                          <div key={kind} className="flex flex-col gap-1">
                            <p className="font-semibold">
                              {label} ({people.length})
                            </p>
                            <p className="break-words text-muted-foreground">
                              {people.length === 0 ? t("portal.activities.nobody") : people.map((p) => (p.people && p.people > 1 ? `${p.name} (${p.people})` : p.name)).join(", ")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <Button type="button" variant="outline" size="cta" className="w-full" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.activities.add")}
          </Button>
        </>
      )}

      <Sheet open={sheet !== null} onOpenChange={(o) => (o ? undefined : setSheet(null))}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
          {sheet ? (
            <>
              <SheetHeader>
                <SheetTitle>{sheet.id ? t("portal.activities.editTitle") : t("portal.activities.addTitle")}</SheetTitle>
              </SheetHeader>
              <ActivityForm
                key={sheet.id ?? "new"}
                initial={sheet}
                guests={guests}
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

function ActivityForm({ initial, guests, onCancel, onDone }: { initial: Draft; guests: Guest[]; onCancel: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setF((s) => ({ ...s, [key]: value }));

  async function settle(action: () => Promise<ActivityResult>) {
    setBusy(true);
    const r = await action();
    setBusy(false);
    if (r.ok) onDone();
    else toast.error(r.error === "invalid" ? t("portal.activities.errGeneric") : t("portal.activities.errGeneric"));
  }

  // "YYYY-MM-DDTHH:mm" strings compare in time order.
  const endError = Boolean(f.endsAtLocal && f.startsAtLocal && f.endsAtLocal <= f.startsAtLocal);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (endError) return void toast.error(t("portal.activities.errTime"));
    if (containsLink(`${f.title} ${f.description} ${f.location}`)) return void toast.error(t("portal.activities.errLinks"));
    const capacity = f.capacity.trim() === "" ? null : Number(f.capacity);
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) return void toast.error(t("portal.activities.errGeneric"));
    void settle(() =>
      saveActivity({
        id: f.id,
        title: f.title,
        description: f.description,
        location: f.location,
        startsAtLocal: f.startsAtLocal,
        endsAtLocal: f.endsAtLocal || null,
        audience: f.audience,
        capacity,
        guestIds: f.audience === "selected" ? f.guestIds : [],
      }),
    );
  }

  const toggle = (id: string) => set("guestIds", f.guestIds.includes(id) ? f.guestIds.filter((x) => x !== id) : [...f.guestIds, id]);

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="a-title">{t("portal.activities.fieldTitle")}</Label>
        <Input id="a-title" required value={f.title} maxLength={80} placeholder={t("portal.activities.fieldTitleHint")} onChange={(e) => set("title", e.target.value)} className="h-12 !text-base" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-start">{t("portal.activities.fieldStart")}</Label>
          <Input id="a-start" type="datetime-local" required value={f.startsAtLocal} onChange={(e) => set("startsAtLocal", e.target.value)} className="h-12 !text-base" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-end">{t("portal.activities.fieldEnd")}</Label>
          <Input id="a-end" type="datetime-local" value={f.endsAtLocal} onChange={(e) => set("endsAtLocal", e.target.value)} aria-invalid={endError} className="h-12 !text-base" />
          {endError ? <p className="text-app-sm font-medium text-destructive">{t("portal.activities.errTime")}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="a-loc">{t("portal.activities.fieldLocation")}</Label>
        <Input id="a-loc" value={f.location} maxLength={100} onChange={(e) => set("location", e.target.value)} className="h-12 !text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="a-desc">{t("portal.activities.fieldDescription")}</Label>
        <Textarea id="a-desc" value={f.description} maxLength={500} onChange={(e) => set("description", e.target.value)} className="!min-h-20 !text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="a-cap">{t("portal.activities.fieldCapacity")}</Label>
        <Input id="a-cap" inputMode="numeric" value={f.capacity} placeholder={t("portal.activities.fieldCapacityHint")} onChange={(e) => set("capacity", e.target.value.replace(/\D/g, ""))} className="h-12 !text-base" />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-app-sm font-semibold">{t("portal.activities.audience")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["all", "selected"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={f.audience === k}
              onClick={() => set("audience", k)}
              className={cn("min-h-11 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors", f.audience === k ? "bg-success text-white ring-success" : "bg-card ring-foreground/15")}
            >
              {k === "all" ? t("portal.activities.audienceAll") : t("portal.activities.audienceSelected")}
            </button>
          ))}
        </div>
        {f.audience === "selected" ? (
          <div className="flex flex-col gap-2 rounded-xl bg-foreground/5 p-3">
            <div className="flex gap-3 text-app-sm font-semibold">
              <button type="button" className="min-h-11 text-success underline dark:!text-white" onClick={() => set("guestIds", guests.map((g) => g.id))}>
                {t("portal.activities.selectAll")}
              </button>
              <button type="button" className="min-h-11 text-muted-foreground underline" onClick={() => set("guestIds", [])}>
                {t("portal.activities.selectNone")}
              </button>
            </div>
            <ul className="flex max-h-56 flex-col overflow-y-auto">
              {guests.map((g) => (
                <li key={g.id}>
                  <label className="flex min-h-11 items-center gap-3 text-app-base">
                    <input type="checkbox" checked={f.guestIds.includes(g.id)} onChange={() => toggle(g.id)} className="size-5" />
                    <span className="break-words">{g.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" variant="success" size="cta" className="flex-1" disabled={busy}>
          {t("portal.activities.save")}
        </Button>
        <Button type="button" variant="outline" size="cta" onClick={onCancel}>
          {t("portal.activities.cancel")}
        </Button>
      </div>
      {f.id ? (
        <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={() => void settle(() => deleteActivity(f.id!))}>
          {t("portal.activities.delete")}
        </Button>
      ) : null}
    </form>
  );
}
