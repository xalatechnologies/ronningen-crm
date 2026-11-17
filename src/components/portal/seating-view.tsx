"use client";

import { Armchair, Check, Circle, Minus, Plus, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AddFab } from "@/components/portal/add-fab";
import { CollapsibleCard } from "@/components/portal/collapsible-card";
import { PORTAL_SHEET } from "@/components/portal/sheet-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "@/i18n/client";
import { assignGuestToTable, deleteSeatingTable, saveSeatingSettings, saveSeatingTable, type SeatingResult } from "@/lib/portal/seating-actions";
import { DEFAULT_TABLE_CAPACITY, guestSeats, MAX_TABLE_CAPACITY, nextTableName, type SeatingGuest, type SeatingSettings, type TableWithGuests } from "@/lib/portal/seating-rules";
import { cn } from "@/lib/utils";

type Draft = { id?: string; name: string; capacity: number };

const STATUS_EMOJI: Record<SeatingGuest["status"], string> = { accepted: "🥳", declined: "😢", maybe: "🤔", invited: "🙈", not_sent: "✉️" };

/**
 * A small round table with its seats around it: a filled seat is taken, a hollow one is free. The middle shows how
 * many sit there; over capacity it turns red and shows how many too many. Very large tables get a bar instead.
 */
function TableGraphic({ used, capacity }: { used: number; capacity: number }) {
  const over = used > capacity;
  if (capacity > 24) {
    const pct = Math.min(100, Math.round((used / capacity) * 100));
    return (
      <span aria-hidden className="block h-2 w-full overflow-hidden rounded-full bg-primary-soft">
        <span className={cn("block h-full rounded-full", over ? "bg-destructive" : "bg-gradient-to-r from-primary to-[#5e1f3d]")} style={{ width: `${pct}%` }} />
      </span>
    );
  }
  const seatR = capacity > 12 ? 4.2 : 5.6;
  const ring = capacity > 12 ? 40 : 38;
  return (
    <svg aria-hidden viewBox="0 0 100 100" className="size-24 shrink-0">
      <circle cx="50" cy="50" r="27" className={over ? "fill-destructive/10 stroke-destructive" : "fill-primary-soft stroke-gold"} strokeWidth="1.6" />
      {Array.from({ length: capacity }, (_, i) => {
        const angle = (-90 + (i * 360) / capacity) * (Math.PI / 180);
        const taken = i < used;
        return (
          <circle
            key={i}
            cx={50 + ring * Math.cos(angle)}
            cy={50 + ring * Math.sin(angle)}
            r={seatR}
            className={taken ? (over ? "fill-destructive stroke-destructive" : "fill-primary stroke-primary") : "fill-card stroke-gold"}
            strokeWidth="1.4"
          />
        );
      })}
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className={cn("font-serif font-semibold", over ? "fill-destructive" : "fill-foreground")} fontSize="19">
        {over ? `+${used - capacity}` : used}
      </text>
    </svg>
  );
}

/** The couple's seating: an overview with three steps, tables with their guests, and who still needs a table. */
export function SeatingView({ tables, unassigned, settings, guestCount }: { tables: TableWithGuests[]; unassigned: SeatingGuest[]; settings: SeatingSettings; guestCount: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [sheet, setSheet] = useState<Draft | null>(null);
  const [picking, setPicking] = useState<TableWithGuests | null>(null);
  const [busy, setBusy] = useState(false);

  const openNew = () => setSheet({ name: nextTableName(tables.map((x) => x.name)), capacity: DEFAULT_TABLE_CAPACITY });
  const seated = guestCount - unassigned.length;
  const pct = guestCount === 0 ? 0 : Math.round((seated / guestCount) * 100);

  async function run(action: () => Promise<SeatingResult>) {
    setBusy(true);
    const r = await action();
    setBusy(false);
    if (!r.ok) toast.error(r.error === "invalid" ? t("portal.seating.errInvalid") : r.error === "limit" ? t("portal.seating.errLimit") : t("portal.seating.errGeneric"));
    router.refresh();
    return r.ok;
  }

  const step = (done: boolean, title: string, detail: string) => (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn("flex size-7 shrink-0 items-center justify-center rounded-full ring-1", done ? "bg-success text-white ring-success" : "bg-card text-muted-foreground ring-gold/50")}
      >
        {done ? <Check className="size-4" strokeWidth={3} /> : <Circle className="size-3" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="font-semibold">{title}</span>
        <span className="text-app-sm text-muted-foreground">{detail}</span>
      </span>
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-rn-card ring-1 ring-gold/40">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl font-semibold">{t("portal.seating.planTitle")}</h2>
          {guestCount > 0 ? (
            <>
              <p className="text-app-sm font-semibold text-muted-foreground">{t("portal.seating.planProgress", { seated, total: guestCount })}</p>
              <span aria-hidden className="mt-1 block h-2 overflow-hidden rounded-full bg-primary-soft">
                <span className="block h-full rounded-full bg-gradient-to-r from-primary to-[#5e1f3d] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
              </span>
            </>
          ) : null}
        </div>
        <ol className="flex flex-col gap-3">
          {step(tables.length > 0, t("portal.seating.step1"), tables.length > 0 ? t("portal.seating.step1Done", { count: tables.length }) : t("portal.seating.step1Todo"))}
          {step(
            guestCount > 0 && unassigned.length === 0 && tables.length > 0,
            t("portal.seating.step2"),
            guestCount === 0 ? t("portal.seating.noGuests") : tables.length === 0 ? t("portal.seating.step2Wait") : unassigned.length === 0 ? t("portal.seating.step2Done") : unassigned.length === 1 ? t("portal.seating.step2TodoOne") : t("portal.seating.step2Todo", { count: unassigned.length }),
          )}
          {step(settings.shared, t("portal.seating.step3"), settings.shared ? t("portal.seating.shareOn") : t("portal.seating.shareOff"))}
        </ol>
        <div className="flex flex-col gap-2 rounded-2xl bg-background p-3 ring-1 ring-gold/30">
          <button
            type="button"
            role="switch"
            aria-checked={settings.shared}
            disabled={busy}
            onClick={() => void run(() => saveSeatingSettings({ shared: !settings.shared }))}
            className="flex min-h-11 items-center justify-between gap-3 text-left font-semibold disabled:opacity-60"
          >
            <span>{t("portal.seating.shareTitle")}</span>
            <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", settings.shared ? "bg-primary" : "bg-foreground/20")}>
              <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-all", settings.shared ? "left-[1.4rem]" : "left-0.5")} />
            </span>
          </button>
          <p className="text-app-xs text-muted-foreground">{t("portal.seating.shareHelp")}</p>
        </div>
      </section>

      {tables.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-10 text-center shadow-rn-card ring-1 ring-gold/40">
          <Armchair className="size-10 text-gold" aria-hidden />
          <p className="text-app-base text-muted-foreground">{guestCount === 0 ? t("portal.seating.noGuests") : t("portal.seating.empty")}</p>
          <Button type="button" variant="success" size="cta" onClick={openNew}>
            <Plus className="size-5" aria-hidden />
            {t("portal.seating.emptyCta")}
          </Button>
        </div>
      ) : (
        <>
          {unassigned.length > 0 ? (
            <CollapsibleCard title={t("portal.seating.unassignedTitle")} help={t("portal.seating.unassignedHelp")} badge={unassigned.length} summary={unassigned.length === 1 ? t("portal.seating.unassignedSummaryOne") : t("portal.seating.unassignedSummary", { count: unassigned.length })}>
              <ul className="flex flex-col gap-2">
                {unassigned.map((g) => {
                  const seats = guestSeats(g);
                  return (
                    <li key={g.id} className="flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 ring-gold/30">
                      <span aria-hidden className="text-xl leading-none">{STATUS_EMOJI[g.status]}</span>
                      <span className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="truncate font-semibold">{g.name}</span>
                        <span className="text-app-xs text-muted-foreground">{seats > 1 ? t("portal.seating.people", { count: seats }) : seats === 0 ? t("portal.guests.status.declined") : t("portal.seating.onePerson")}</span>
                      </span>
                      <select
                        aria-label={`${g.name}: ${t("portal.seating.pickTable")}`}
                        value=""
                        disabled={busy}
                        onChange={(e) => e.target.value && void run(() => assignGuestToTable(g.id, e.target.value))}
                        className="h-11 max-w-[9.5rem] shrink-0 rounded-full border border-gold/50 bg-card px-3 text-app-sm font-semibold"
                      >
                        <option value="">{t("portal.seating.pickTable")}</option>
                        {tables.map((tb) => (
                          <option key={tb.id} value={tb.id}>
                            {tb.name}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </CollapsibleCard>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {tables.map((tb) => (
              <CollapsibleCard
                key={tb.id}
                title={tb.name}
                badge={`${tb.seatsUsed}/${tb.capacity}`}
                summary={tb.over ? t("portal.seating.over", { count: tb.seatsUsed - tb.capacity }) : t("portal.seating.seatsOf", { used: tb.seatsUsed, capacity: tb.capacity })}
                className="self-start"
              >
                <div className="flex items-center gap-4">
                  <TableGraphic used={tb.seatsUsed} capacity={tb.capacity} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="font-semibold">{t("portal.seating.seatsOf", { used: tb.seatsUsed, capacity: tb.capacity })}</p>
                    <p className={cn("text-app-sm font-semibold", tb.over ? "text-destructive" : tb.seatsUsed === tb.capacity ? "text-success" : "text-muted-foreground")}>
                      {tb.over
                        ? t("portal.seating.over", { count: tb.seatsUsed - tb.capacity })
                        : tb.seatsUsed === tb.capacity
                          ? t("portal.seating.seatsFull")
                          : tb.capacity - tb.seatsUsed === 1
                            ? t("portal.seating.seatsFreeOne")
                            : t("portal.seating.seatsFree", { count: tb.capacity - tb.seatsUsed })}
                    </p>
                  </div>
                </div>
                {tb.guests.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gold/50 px-4 py-3 text-app-sm text-muted-foreground">{t("portal.seating.emptyTable")}</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {tb.guests.map((g) => {
                      const seats = guestSeats(g);
                      return (
                        <li key={g.id} className="flex items-center gap-1 rounded-full bg-background py-1 pl-3 pr-1 ring-1 ring-gold/40">
                          <span aria-hidden className="text-base leading-none">{STATUS_EMOJI[g.status]}</span>
                          <span className="max-w-[9rem] truncate text-app-sm font-semibold">{g.name}</span>
                          {seats > 1 ? <span className="text-app-xs text-muted-foreground">· {seats}</span> : null}
                          <button
                            type="button"
                            aria-label={`${g.name}: ${t("portal.seating.removeGuest")}`}
                            title={t("portal.seating.removeGuest")}
                            disabled={busy}
                            onClick={() => void run(() => assignGuestToTable(g.id, null))}
                            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted active:scale-90"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="success" size="sm" className="min-h-11 rounded-full px-4" disabled={guestCount === 0} onClick={() => setPicking(tb)}>
                    <UserPlus className="size-4" aria-hidden />
                    {t("portal.seating.addGuests")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="min-h-11 rounded-full" onClick={() => setSheet({ id: tb.id, name: tb.name, capacity: tb.capacity })}>
                    {t("portal.seating.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 rounded-full text-destructive"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t("portal.seating.confirmDelete"))) void run(() => deleteSeatingTable(tb.id));
                    }}
                  >
                    {t("portal.seating.delete")}
                  </Button>
                </div>
              </CollapsibleCard>
            ))}
          </div>

          <Button type="button" variant="outline" size="cta" className="hidden w-full sm:inline-flex" onClick={openNew}>
            <Plus className="size-5" aria-hidden />
            {t("portal.seating.add")}
          </Button>
          <AddFab label={t("portal.seating.add")} onClick={openNew} />
        </>
      )}

      <Sheet open={sheet !== null} onOpenChange={(o) => (o ? undefined : setSheet(null))}>
        <SheetContent side="bottom" className={cn(PORTAL_SHEET, "max-h-[92dvh] overflow-y-auto")}>
          {sheet ? (
            <>
              <SheetHeader>
                <SheetTitle>{sheet.id ? t("portal.seating.editTitle") : t("portal.seating.addTitle")}</SheetTitle>
              </SheetHeader>
              <TableForm
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

      <Sheet open={picking !== null} onOpenChange={(o) => (o ? undefined : setPicking(null))}>
        <SheetContent side="bottom" className={cn(PORTAL_SHEET, "max-h-[92dvh] overflow-y-auto")}>
          {picking ? (
            <>
              <SheetHeader>
                <SheetTitle>{t("portal.seating.pickerTitle", { table: picking.name })}</SheetTitle>
              </SheetHeader>
              <GuestPicker
                key={picking.id}
                table={picking}
                candidates={[
                  ...unassigned.map((g) => ({ guest: g, from: null as string | null })),
                  ...tables.filter((x) => x.id !== picking.id).flatMap((x) => x.guests.map((g) => ({ guest: g, from: x.name as string | null }))),
                ]}
                onCancel={() => setPicking(null)}
                onDone={() => {
                  setPicking(null);
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

/** Pick several guests at once for a table. Guests who sit at another table are moved, so each guest keeps one table. */
function GuestPicker({
  table,
  candidates,
  onCancel,
  onDone,
}: {
  table: TableWithGuests;
  candidates: { guest: SeatingGuest; from: string | null }[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const left = table.capacity - table.seatsUsed;
  const chosenSeats = candidates.filter((c) => chosen.has(c.guest.id)).reduce((n, c) => n + guestSeats(c.guest), 0);
  const overBy = chosenSeats - left;
  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function add() {
    setBusy(true);
    let failed = false;
    for (const id of chosen) {
      const r = await assignGuestToTable(id, table.id);
      if (!r.ok) failed = true;
    }
    setBusy(false);
    if (failed) toast.error(t("portal.seating.errGeneric"));
    onDone();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
      <p className="text-app-sm text-muted-foreground">{t("portal.seating.pickerHelp")}</p>
      <p className={cn("text-app-sm font-semibold", overBy > 0 ? "text-destructive" : "text-primary")}>
        {overBy > 0 ? t("portal.seating.pickerOver", { count: overBy }) : (() => { const n = Math.max(0, left - chosenSeats); return n === 1 ? t("portal.seating.pickerLeftOne") : t("portal.seating.pickerLeft", { count: n }); })()}
      </p>
      {candidates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold/50 px-4 py-3 text-app-sm text-muted-foreground">{t("portal.seating.pickerNone")}</p>
      ) : (
        <ul className="flex max-h-[45dvh] flex-col gap-2 overflow-y-auto">
          {candidates.map(({ guest: g, from }) => {
            const seats = guestSeats(g);
            const on = chosen.has(g.id);
            return (
              <li key={g.id}>
                <label className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl p-3 ring-1 transition-colors", on ? "bg-primary/8 ring-primary" : "bg-background ring-gold/30")}>
                  <input type="checkbox" checked={on} onChange={() => toggle(g.id)} className="size-5 accent-primary" />
                  <span aria-hidden className="text-xl leading-none">{STATUS_EMOJI[g.status]}</span>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate font-semibold">{g.name}</span>
                    <span className="text-app-xs text-muted-foreground">
                      {seats > 1 ? t("portal.seating.people", { count: seats }) : t("portal.seating.onePerson")}
                      {from ? ` · ${t("portal.seating.atTable", { table: from })}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <Button type="button" variant="success" size="cta" disabled={busy || chosen.size === 0} onClick={() => void add()}>
          {chosen.size === 0 ? t("portal.seating.pickerAddZero") : t("portal.seating.pickerAdd", { count: chosen.size })}
        </Button>
        <Button type="button" variant="outline" size="cta" disabled={busy} onClick={onCancel}>
          {t("portal.seating.cancel")}
        </Button>
      </div>
    </div>
  );
}

function TableForm({ initial, onCancel, onDone }: { initial: Draft; onCancel: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial.name);
  const [capacity, setCapacity] = useState(String(initial.capacity));
  const [busy, setBusy] = useState(false);
  const cap = /^\d{1,2}$/.test(capacity) ? Number(capacity) : undefined;
  const valid = cap !== undefined && cap >= 1 && cap <= MAX_TABLE_CAPACITY;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return void toast.error(t("portal.seating.errInvalid"));
    setBusy(true);
    const r = await saveSeatingTable({ id: initial.id, name, capacity: cap });
    setBusy(false);
    if (r.ok) {
      toast.success(t("portal.seating.saved"));
      onDone();
    } else toast.error(r.error === "invalid" ? t("portal.seating.errInvalid") : r.error === "limit" ? t("portal.seating.errLimit") : t("portal.seating.errGeneric"));
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="tb-name">{t("portal.seating.fieldName")}</Label>
        <Input id="tb-name" required autoFocus={!initial.id} value={name} maxLength={40} placeholder={t("portal.seating.fieldNameHint")} onChange={(e) => setName(e.target.value)} className="h-12 !text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="tb-cap">{t("portal.seating.fieldCapacity")}</Label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="−"
            disabled={(cap ?? 1) <= 1}
            onClick={() => setCapacity(String(Math.max(1, (cap ?? 1) - 1)))}
            className="flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-gold/50 transition-transform enabled:active:scale-95 disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <Input id="tb-cap" inputMode="numeric" value={capacity} maxLength={2} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, "").slice(0, 2))} className="h-12 w-20 text-center !text-lg font-semibold" />
          <button
            type="button"
            aria-label="+"
            disabled={(cap ?? 0) >= MAX_TABLE_CAPACITY}
            onClick={() => setCapacity(String(Math.min(MAX_TABLE_CAPACITY, (cap ?? 0) + 1)))}
            className="flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-gold/50 transition-transform enabled:active:scale-95 disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-app-xs text-muted-foreground">{t("portal.seating.fieldCapacityHelp")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button type="submit" variant="success" size="cta" disabled={busy}>
          {t("portal.seating.save")}
        </Button>
        <Button type="button" variant="outline" size="cta" disabled={busy} onClick={onCancel}>
          {t("portal.seating.cancel")}
        </Button>
      </div>
    </form>
  );
}
