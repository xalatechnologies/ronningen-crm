"use client";

import { ChevronDown, ClipboardPaste, MessageSquareText, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { CelebrationPopup, type CelebrationState } from "@/components/portal/celebration-popup";

import { Blossom, BotanicalSprig } from "@/components/brand/botanical";
import { PORTAL_SHEET } from "@/components/portal/sheet-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import {
  deleteAllGuests,
  deleteGuest,
  importGuests,
  saveGuest,
  type GuestError,
  type GuestResult,
} from "@/lib/portal/guest-actions";
import { sendGuestEmails } from "@/lib/portal/guest-send-actions";
import { DIET_TAGS, MAX_PARTY, parseGuestPaste, summarizeGuests, type GuestRow, type GuestStatus } from "@/lib/portal/guest-rules";
import { cn } from "@/lib/utils";

type Draft = { id?: string; name: string; email: string; phone: string; groupLabel: string; maxParty: string };
const emptyDraft: Draft = { name: "", email: "", phone: "", groupLabel: "", maxParty: "1" };

const TONE: Record<GuestStatus, string> = {
  not_sent: "bg-foreground/8 text-muted-foreground",
  invited: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  accepted: "bg-success/15 text-success dark:!text-white",
  declined: "bg-destructive/12 text-destructive",
  maybe: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
};

const STATUS_EMOJI: Record<GuestStatus, string> = {
  not_sent: "✉️",
  invited: "💌",
  accepted: "🥳",
  declined: "😢",
  maybe: "🤔",
};

type FilterKey = "coming" | "declined" | "maybe" | "noAnswer";
const FILTER_STATUSES: Record<FilterKey, GuestStatus[]> = {
  coming: ["accepted"],
  declined: ["declined"],
  maybe: ["maybe"],
  noAnswer: ["invited", "not_sent"],
};
/** Long lists get search, filter-by-tile and paging; short lists look as before. */
const SEARCH_THRESHOLD = 8;
const PAGE_SIZE = 25;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

function errorText(t: ReturnType<typeof useTranslation>["t"], error: GuestError): string {
  return error === "duplicate" ? t("portal.guests.errDuplicate") : error === "limit" ? t("portal.guests.errLimit") : t("portal.guests.errGeneric");
}

export type SendState = { enabled: boolean; published: boolean; inviteCount: number; reminderCount: number; missingEmail: number };

export function GuestsView({ guests, sendState }: { guests: GuestRow[]; sendState: SendState }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [sheet, setSheet] = useState<Draft | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendMode, setSendMode] = useState<"invite" | "reminder" | null>(null);
  const [celebration, setCelebration] = useState<CelebrationState>(null);
  const celebrationSeq = useRef(0);
  const clearCelebration = useCallback(() => setCelebration(null), []);
  const celebrate = (c: Omit<NonNullable<CelebrationState>, "id">) => {
    celebrationSeq.current += 1;
    setCelebration({ id: celebrationSeq.current, ...c });
  };

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const manyGuests = guests.length > SEARCH_THRESHOLD;

  const summary = useMemo(() => summarizeGuests(guests), [guests]);
  const dietRows = useMemo(
    () => DIET_TAGS.map((tag) => ({ tag, count: summary.diet[tag] ?? 0 })).filter((row) => row.count > 0).sort((a, b) => b.count - a.count),
    [summary],
  );
  const dietMax = dietRows[0]?.count ?? 1;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter(
      (g) =>
        (!filter || FILTER_STATUSES[filter].includes(g.status)) &&
        (!q || g.name.toLowerCase().includes(q) || (g.email ?? "").toLowerCase().includes(q)),
    );
  }, [guests, query, filter]);
  const shown = useMemo(() => visible.slice(0, limit), [visible, limit]);
  const groups = useMemo(() => {
    const labels = [...new Set(shown.map((g) => g.groupLabel).filter((l): l is string => Boolean(l)))].sort((a, b) => a.localeCompare(b));
    const sections = labels.map((label) => ({ label, rows: shown.filter((g) => g.groupLabel === label) }));
    const rest = shown.filter((g) => !g.groupLabel);
    if (rest.length > 0) sections.push({ label: "", rows: rest });
    return sections;
  }, [shown]);

  async function send(mode: "invite" | "reminder") {
    setBusy(true);
    const r = await sendGuestEmails(mode);
    setBusy(false);
    setSendMode(null);
    if (!r.ok) {
      toast.error(
        r.error === "disabled" ? t("portal.guestSend.disabled") : r.error === "no_design" ? t("portal.guestSend.needDesign") : r.error === "nothing" ? t("portal.guestSend.nothing") : t("portal.guestSend.failed"),
      );
    } else {
      if (r.sent > 0 || r.failed > 0) {
        toast.success(r.failed > 0 ? t("portal.guestSend.sentPartial", { sent: r.sent, failed: r.failed }) : t("portal.guestSend.sent", { count: r.sent }));
      }
      // A party only when everything went out; a partly failed send gets the plain message.
      if (r.sent > 0 && r.failed === 0) {
        celebrate(
          mode === "invite"
            ? { emoji: "💌", title: t("portal.guestSend.celebrateInviteTitle"), body: t("portal.guestSend.celebrateInviteBody", { count: r.sent }), confetti: true }
            : { emoji: "📨", title: t("portal.guestSend.celebrateReminderTitle"), body: t("portal.guestSend.celebrateReminderBody", { count: r.sent }) },
        );
      }
      if (r.capped > 0) toast.message(t("portal.guestSend.capped", { count: r.capped }));
    }
    router.refresh();
  }

  async function removeAll() {
    setBusy(true);
    const r = await deleteAllGuests();
    setBusy(false);
    setConfirmAll(false);
    if (!r.ok) toast.error(t("portal.guests.errGeneric"));
    router.refresh();
  }

  const sendBarShown = sendState.enabled && sendState.published && (sendState.inviteCount > 0 || sendState.reminderCount > 0);

  return (
    <div className="flex flex-col gap-6">
      <CelebrationPopup celebration={celebration} onDone={clearCelebration} />
      {guests.length === 0 ? (
        <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl bg-card px-6 py-10 text-center shadow-rn-card ring-1 ring-gold/40">
          <Blossom className="size-10 text-gold" filled />
          <p className="text-app-base text-muted-foreground">{t("portal.guests.empty")}</p>
          <Button type="button" variant="success" size="cta" onClick={() => setSheet({ ...emptyDraft })}>
            <Plus className="size-5" aria-hidden />
            {t("portal.guests.emptyCta")}
          </Button>
          <Button type="button" variant="outline" size="cta" onClick={() => setImporting(true)}>
            <ClipboardPaste className="size-5" aria-hidden />
            {t("portal.guests.importList")}
          </Button>
        </div>
      ) : (
        <>
          <section className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-card p-5 shadow-rn-card ring-1 ring-gold/40">
            <BotanicalSprig className="absolute -right-3 -top-3 h-28 w-20 text-primary/15" />
            <p className="relative font-serif text-3xl font-semibold leading-none">{t("portal.guests.countLine", { count: summary.total })}</p>
            {summary.invited === 0 ? (
              <p className="text-app-sm text-muted-foreground">{t("portal.guests.comingSoon")}</p>
            ) : (
              <ul className="relative grid grid-cols-2 gap-2.5 text-app-sm font-semibold sm:grid-cols-4">
                <li><button type="button" aria-pressed={filter === "coming"} onClick={() => { setFilter(filter === "coming" ? null : "coming"); setLimit(PAGE_SIZE); }} className={cn("flex w-full items-center gap-2 rounded-2xl bg-success/15 px-3.5 py-3 text-left ring-1 transition-shadow", filter === "coming" ? "ring-2 ring-primary" : "ring-foreground/5", filter && filter !== "coming" && "opacity-55")}><span aria-hidden className="text-xl leading-none">🥳</span><span>{t("portal.guests.summaryComing", { count: summary.acceptedPeople })}</span></button></li>
                <li><button type="button" aria-pressed={filter === "declined"} onClick={() => { setFilter(filter === "declined" ? null : "declined"); setLimit(PAGE_SIZE); }} className={cn("flex w-full items-center gap-2 rounded-2xl bg-destructive/12 px-3.5 py-3 text-left ring-1 transition-shadow", filter === "declined" ? "ring-2 ring-primary" : "ring-foreground/5", filter && filter !== "declined" && "opacity-55")}><span aria-hidden className="text-xl leading-none">😢</span><span>{t("portal.guests.summaryDeclined", { count: summary.declined })}</span></button></li>
                <li><button type="button" aria-pressed={filter === "maybe"} onClick={() => { setFilter(filter === "maybe" ? null : "maybe"); setLimit(PAGE_SIZE); }} className={cn("flex w-full items-center gap-2 rounded-2xl bg-sky-500/15 px-3.5 py-3 text-left ring-1 transition-shadow", filter === "maybe" ? "ring-2 ring-primary" : "ring-foreground/5", filter && filter !== "maybe" && "opacity-55")}><span aria-hidden className="text-xl leading-none">🤔</span><span>{t("portal.guests.summaryMaybe", { count: summary.maybe })}</span></button></li>
                <li><button type="button" aria-pressed={filter === "noAnswer"} onClick={() => { setFilter(filter === "noAnswer" ? null : "noAnswer"); setLimit(PAGE_SIZE); }} className={cn("flex w-full items-center gap-2 rounded-2xl bg-amber-500/15 px-3.5 py-3 text-left ring-1 transition-shadow", filter === "noAnswer" ? "ring-2 ring-primary" : "ring-foreground/5", filter && filter !== "noAnswer" && "opacity-55")}><span aria-hidden className="text-xl leading-none">🙈</span><span>{t("portal.guests.summaryNoAnswer", { count: summary.noAnswer })}</span></button></li>
              </ul>
            )}
          </section>

          {summary.invited > 0 ? (
            <section className="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-rn-card ring-1 ring-gold/40">
              <h2 className="font-serif text-xl font-semibold">{t("portal.staffGuests.dietTitle")}</h2>
              {dietRows.length === 0 ? (
                <p className="text-app-sm text-muted-foreground">{t("portal.staffGuests.dietNone")}</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {dietRows.map(({ tag, count }) => (
                    <li key={tag} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-app-sm">
                      <span className="truncate font-semibold">{t(`portal.diet.tags.${tag}` as TranslationKey)}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-primary-soft" aria-hidden>
                        <span className="block h-full rounded-full bg-gradient-to-r from-primary to-[#5e1f3d]" style={{ width: `${Math.max(8, (count / dietMax) * 100)}%` }} />
                      </span>
                      <span className="text-right font-serif text-lg font-semibold tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {manyGuests ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(PAGE_SIZE);
                }}
                aria-label={t("portal.guests.title")}
                className="h-12 rounded-full bg-card pl-10 ring-1 ring-gold/40"
              />
            </div>
          ) : null}

          {groups.map((section) => (
            <section key={section.label || "_"} className="flex flex-col gap-3">
              {section.label ? <h2 className="font-serif text-xl font-semibold">{section.label}</h2> : groups.length > 1 ? <h2 className="font-serif text-xl font-semibold">—</h2> : null}
              <ul className="flex flex-col gap-2.5">
                {section.rows.map((g) => (
                  <li key={g.id} className="overflow-hidden rounded-2xl bg-card shadow-rn-card ring-1 ring-gold/30">
                    <button
                      type="button"
                      onClick={() =>
                        setSheet({
                          id: g.id,
                          name: g.name,
                          email: g.email ?? "",
                          phone: g.phone ?? "",
                          groupLabel: g.groupLabel ?? "",
                          maxParty: String(g.maxParty),
                        })
                      }
                      className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-soft to-secondary font-serif text-base font-semibold text-success ring-1 ring-gold/50 dark:!text-white" aria-hidden>
                        {initials(g.name)}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="break-words font-semibold">{g.name}</span>
                        <span className="truncate text-app-sm text-muted-foreground">{g.email ?? t("portal.guests.noEmail")}</span>
                        {g.maxParty > 1 ? (
                          <span className="text-app-xs text-muted-foreground">{t("portal.guests.partyUpTo", { count: g.maxParty })}</span>
                        ) : null}
                        {g.status === "accepted" ? <AnswerSummary guest={g} /> : null}
                        {g.deliveryIssue ? (
                          <span className={cn("text-app-xs font-medium", g.deliveryIssue === "bounced" ? "text-destructive" : "text-amber-700 dark:text-amber-300")}>
                            {t(g.deliveryIssue === "bounced" ? "portal.guests.deliveryBounced" : "portal.guests.deliveryDelayed")}
                          </span>
                        ) : null}
                      </span>
                      </span>
                      <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-app-xs font-semibold", TONE[g.status])}>
                        <span aria-hidden className="mr-1">{STATUS_EMOJI[g.status]}</span>
                        {t(`portal.guests.status.${g.status}` as TranslationKey)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {visible.length > limit ? (
            <Button type="button" variant="outline" className="self-center rounded-full border-gold/60" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
              <ChevronDown className="size-4" aria-hidden />
              {visible.length - limit}
            </Button>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="hidden grid-cols-1 gap-2 sm:grid sm:grid-cols-2">
              <Button type="button" variant="outline" size="cta" className="w-full rounded-full border-gold/60" onClick={() => setSheet({ ...emptyDraft })}>
                <Plus className="size-5" aria-hidden />
                {t("portal.guests.add")}
              </Button>
              <Button type="button" variant="outline" size="cta" className="w-full rounded-full border-gold/60" onClick={() => setImporting(true)}>
                <ClipboardPaste className="size-5" aria-hidden />
                {t("portal.guests.importList")}
              </Button>
            </div>
            <Button type="button" variant="ghost" className="self-center text-app-sm text-destructive" onClick={() => setConfirmAll(true)}>
              {t("portal.guests.deleteAll")}
            </Button>
          </div>

          {/* Mobile only: floating actions in the bottom-right corner, above the tab bar (and the send bar when shown). */}
          <div
            className={cn(
              "kb-hide fixed right-4 z-20 flex flex-col items-end gap-3 sm:hidden",
              sendBarShown ? "bottom-[calc(8.25rem+env(safe-area-inset-bottom))]" : "bottom-[calc(5rem+env(safe-area-inset-bottom))]",
            )}
          >
            <button
              type="button"
              onClick={() => setImporting(true)}
              aria-label={t("portal.guests.importList")}
              className="flex size-12 items-center justify-center rounded-full bg-card text-success shadow-rn-card ring-1 ring-gold/60 transition-transform active:scale-95 dark:!text-white"
            >
              <ClipboardPaste className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setSheet({ ...emptyDraft })}
              aria-label={t("portal.guests.add")}
              className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#5e1f3d] text-primary-foreground shadow-rn-hero-success ring-2 ring-gold/70 transition-transform active:scale-95"
            >
              <Plus className="size-7" aria-hidden />
            </button>
          </div>
        </>
      )}

      {guests.length > 0 && sendState.missingEmail > 0 ? (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-app-sm">{t("portal.guestSend.missingEmail", { count: sendState.missingEmail })}</p>
      ) : null}
      {guests.length > 0 && sendState.published && !sendState.enabled ? (
        <p className="rounded-xl bg-foreground/5 px-4 py-3 text-app-sm text-muted-foreground">{t("portal.guestSend.disabled")}</p>
      ) : null}
      {guests.length > 0 && sendState.enabled && !sendState.published ? (
        <p className="rounded-xl bg-foreground/5 px-4 py-3 text-app-sm text-muted-foreground">{t("portal.guestSend.needDesign")}</p>
      ) : null}

      {sendState.enabled && sendState.published && (sendState.inviteCount > 0 || sendState.reminderCount > 0) ? (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-foreground/8 bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:rounded-2xl sm:border">
          <Button type="button" variant="success" size="cta" className="w-full" onClick={() => setSendMode(sendState.inviteCount > 0 ? "invite" : "reminder")}>
            {sendState.inviteCount > 0
              ? t("portal.guestSend.sendInvite", { count: sendState.inviteCount })
              : t("portal.guestSend.sendReminder", { count: sendState.reminderCount })}
          </Button>
        </div>
      ) : null}

      <Sheet open={sendMode !== null} onOpenChange={(open) => (open ? undefined : setSendMode(null))}>
        <SheetContent side="bottom" className={PORTAL_SHEET}>
          <SheetHeader>
            <SheetTitle>{sendMode === "reminder" ? t("portal.guestSend.reminderTitle") : t("portal.guestSend.inviteTitle")}</SheetTitle>
          </SheetHeader>
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
            <p className="text-muted-foreground">
              {sendMode === "reminder"
                ? t("portal.guestSend.reminderBody", { count: sendState.reminderCount })
                : t("portal.guestSend.inviteBody", { count: sendState.inviteCount })}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="success" size="cta" className="flex-1" disabled={busy} onClick={() => sendMode && void send(sendMode)}>
                {t("portal.guestSend.confirm")}
              </Button>
              <Button type="button" variant="outline" size="cta" onClick={() => setSendMode(null)}>
                {t("portal.guests.cancel")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheet !== null} onOpenChange={(open) => (open ? undefined : setSheet(null))}>
        <SheetContent side="bottom" className={cn(PORTAL_SHEET, "max-h-[92dvh] overflow-y-auto")}>
          {sheet ? (
            <>
              <SheetHeader>
                <SheetTitle>{sheet.id ? t("portal.guests.editTitle") : t("portal.guests.addTitle")}</SheetTitle>
              </SheetHeader>
              {sheet.id ? <GuestAnswer guest={guests.find((g) => g.id === sheet.id) ?? null} /> : null}
              <GuestForm
                key={sheet.id ?? "new"}
                initial={sheet}
                existingGroups={groups.map((g) => g.label).filter(Boolean)}
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

      <Sheet open={importing} onOpenChange={setImporting}>
        <SheetContent side="bottom" className={cn(PORTAL_SHEET, "max-h-[92dvh] overflow-y-auto")}>
          <SheetHeader>
            <SheetTitle>{t("portal.guests.importTitle")}</SheetTitle>
          </SheetHeader>
          {importing ? (
            <ImportForm
              existingEmails={new Set(guests.map((g) => g.email).filter((e): e is string => Boolean(e)))}
              room={300 - guests.length}
              onCancel={() => setImporting(false)}
              onDone={(added) => {
                setImporting(false);
                toast.success(t("portal.guests.importDone", { count: added }));
                if (added > 0) celebrate({ emoji: "🥳", title: t("portal.guests.celebrateImportTitle"), body: t("portal.guests.celebrateImportBody", { count: added }), confetti: true });
                router.refresh();
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={confirmAll} onOpenChange={setConfirmAll}>
        <SheetContent side="bottom" className={PORTAL_SHEET}>
          <SheetHeader>
            <SheetTitle>{t("portal.guests.deleteAllTitle")}</SheetTitle>
          </SheetHeader>
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
            <p className="text-muted-foreground">{t("portal.guests.deleteAllBody", { count: guests.length })}</p>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" size="cta" className="flex-1" disabled={busy} onClick={() => void removeAll()}>
                {t("portal.guests.deleteAllConfirm")}
              </Button>
              <Button type="button" variant="outline" size="cta" onClick={() => setConfirmAll(false)}>
                {t("portal.guests.cancel")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function GuestForm({
  initial,
  existingGroups,
  onCancel,
  onDone,
}: {
  initial: Draft;
  existingGroups: string[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function settle(action: () => Promise<GuestResult>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) onDone();
    else toast.error(errorText(t, result.error));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void settle(() =>
      saveGuest({ id: form.id, name: form.name, email: form.email, phone: form.phone, groupLabel: form.groupLabel, maxParty: Number(form.maxParty) }),
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="g-name">{t("portal.guests.fieldName")}</Label>
        <Input id="g-name" required value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} className="h-12 !text-base" autoComplete="off" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="g-email">{t("portal.guests.fieldEmail")}</Label>
        <Input id="g-email" type="email" inputMode="email" value={form.email} maxLength={254} onChange={(e) => set("email", e.target.value)} className="h-12 !text-base" autoComplete="off" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="g-group">{t("portal.guests.fieldGroup")}</Label>
        <Input
          id="g-group"
          value={form.groupLabel}
          maxLength={40}
          placeholder={t("portal.guests.fieldGroupHint")}
          onChange={(e) => set("groupLabel", e.target.value)}
          className="h-12 !text-base"
          autoComplete="off"
        />
        {existingGroups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {existingGroups.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={form.groupLabel === g}
                onClick={() => set("groupLabel", form.groupLabel === g ? "" : g)}
                className={cn(
                  "min-h-11 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors",
                  form.groupLabel === g ? "bg-primary !text-primary-foreground ring-primary" : "bg-card ring-foreground/15 hover:bg-muted/60",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="g-party">{t("portal.guests.fieldMaxParty")}</Label>
          <select
            id="g-party"
            value={form.maxParty}
            onChange={(e) => set("maxParty", e.target.value)}
            className="h-12 w-full rounded-2xl border border-gold/40 bg-card px-3 text-base"
          >
            {Array.from({ length: MAX_PARTY }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="g-phone">{t("portal.guests.fieldPhone")}</Label>
          <Input id="g-phone" type="tel" inputMode="tel" value={form.phone} maxLength={30} onChange={(e) => set("phone", e.target.value)} className="h-12 !text-base rounded-2xl border-gold/40 bg-card" autoComplete="off" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="success" size="cta" className="flex-1" disabled={busy}>
          {t("portal.guests.save")}
        </Button>
        <Button type="button" variant="outline" size="cta" onClick={onCancel}>
          {t("portal.guests.cancel")}
        </Button>
      </div>
      {form.id ? (
        <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={() => void settle(() => deleteGuest(form.id!))}>
          {t("portal.guests.delete")}
        </Button>
      ) : null}
    </form>
  );
}

function ImportForm({
  existingEmails,
  room,
  onCancel,
  onDone,
}: {
  existingEmails: ReadonlySet<string>;
  room: number;
  onCancel: () => void;
  onDone: (added: number) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseGuestPaste> | null>(null);
  const [busy, setBusy] = useState(false);

  const reason = (r: "no_name" | "bad_email" | "duplicate" | "too_many") =>
    t(`portal.guests.${{ no_name: "reasonNoName", bad_email: "reasonBadEmail", duplicate: "reasonDuplicate", too_many: "reasonTooMany" }[r]}` as TranslationKey);

  async function add() {
    setBusy(true);
    const result = await importGuests(text);
    setBusy(false);
    if (result.ok) onDone(result.added);
    else toast.error(errorText(t, result.error));
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-2">
      <p className="text-app-sm text-muted-foreground">{t("portal.guests.importHelp")}</p>
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
        placeholder={t("portal.guests.importPlaceholder")}
        aria-label={t("portal.guests.importTitle")}
        className="!min-h-40 !text-base"
      />
      {preview ? (
        <div className="flex flex-col gap-2 rounded-xl bg-foreground/5 p-3 text-app-sm">
          <p className="font-semibold">{t("portal.guests.importReady", { count: preview.rows.length })}</p>
          {preview.errors.length > 0 ? (
            <>
              <p className="font-semibold">{t("portal.guests.importSkipped", { count: preview.errors.length })}</p>
              <ul className="flex flex-col gap-1 text-muted-foreground">
                {preview.errors.slice(0, 8).map((e) => (
                  <li key={e.line} className="break-words">
                    {e.line}: {e.text} ({reason(e.reason)})
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="flex gap-2">
        {preview && preview.rows.length > 0 ? (
          <Button type="button" variant="success" size="cta" className="flex-1" disabled={busy} onClick={() => void add()}>
            {t("portal.guests.importAdd", { count: preview.rows.length })}
          </Button>
        ) : (
          <Button type="button" variant="success" size="cta" className="flex-1" disabled={text.trim() === ""} onClick={() => setPreview(parseGuestPaste(text, existingEmails, room))}>
            {t("portal.guests.importPreview")}
          </Button>
        )}
        <Button type="button" variant="outline" size="cta" onClick={onCancel}>
          {t("portal.guests.cancel")}
        </Button>
      </div>
    </div>
  );
}

type Translate = ReturnType<typeof useTranslation>["t"];

const partyLabel = (t: Translate, count: number) => (count === 1 ? t("portal.guestSend.answerPartyOne") : t("portal.guestSend.answerParty", { count }));
const PANEL: Record<GuestStatus, string> = {
  not_sent: "bg-foreground/5 ring-foreground/10",
  invited: "bg-amber-500/10 ring-amber-500/30",
  accepted: "bg-success/10 ring-success/30",
  declined: "bg-destructive/8 ring-destructive/25",
  maybe: "bg-sky-500/10 ring-sky-500/30",
};

/** What the guest said, visible in the list itself: party size, diet tags and whether they left a comment. */
function AnswerSummary({ guest }: { guest: GuestRow }) {
  const { t } = useTranslation();
  const tags = [...new Set(guest.diet.flatMap((p) => p.tags))];
  const hasNote = guest.diet.some((p) => p.note.trim() !== "");
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-success px-2.5 py-0.5 text-app-xs font-semibold text-white">{partyLabel(t, guest.partySize)}</span>
      {tags.slice(0, 3).map((tag) => (
        <span key={tag} className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-app-xs font-semibold text-amber-800 dark:text-amber-300">
          {t(`portal.diet.tags.${tag}` as TranslationKey)}
        </span>
      ))}
      {tags.length > 3 ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-app-xs font-semibold text-amber-800 dark:text-amber-300">+{tags.length - 3}</span> : null}
      {hasNote ? <MessageSquareText className="size-4 text-muted-foreground" role="img" aria-label={t("portal.guestSend.hasNote")} /> : null}
    </span>
  );
}

function GuestAnswer({ guest }: { guest: GuestRow | null }) {
  const { t } = useTranslation();
  if (!guest || guest.status === "not_sent") return null;
  const answered = guest.status !== "invited";
  const people = guest.diet.map((p, i) => ({ p, i })).filter(({ p }) => p.tags.length > 0 || p.note);
  return (
    <section className={cn("mx-auto mb-5 flex w-full max-w-lg flex-col gap-4 rounded-3xl p-5 ring-1 ring-gold/50", PANEL[guest.status])}>
      <h3 className="font-sans text-app-sm font-semibold uppercase tracking-widest text-muted-foreground">{t("portal.guestSend.answerTitle")}</h3>
      {!answered ? (
        <p className="text-app-base text-muted-foreground">{t("portal.guestSend.answerNotYet")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("rounded-full px-4 py-1.5 font-serif text-xl font-semibold", guest.status === "accepted" ? "bg-success !text-white" : TONE[guest.status])}>{t(`portal.guests.status.${guest.status}` as TranslationKey)}</span>
            {guest.status === "accepted" ? <span className="font-serif text-xl font-semibold">{partyLabel(t, guest.partySize)}</span> : null}
          </div>
          {guest.status === "accepted" ? (
            people.length === 0 ? (
              <p className="text-app-base text-muted-foreground">{t("portal.guestSend.answerNoDiet")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {people.map(({ p, i }) => (
                  <li key={i} className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-gold/40">
                    {guest.diet.length > 1 ? <span className="text-app-sm font-semibold text-muted-foreground">{t("portal.guestSend.person", { n: i + 1 })}</span> : null}
                    {p.tags.length > 0 ? (
                      <span className="flex flex-wrap gap-2">
                        {p.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-amber-500/15 px-3 py-1 text-app-sm font-semibold text-amber-800 dark:text-amber-300">
                            {t(`portal.diet.tags.${tag}` as TranslationKey)}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    {p.note ? <span className="break-words border-l-4 border-gold/60 pl-3 text-app-base italic">{p.note}</span> : null}
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </>
      )}
      {guest.optedOut ? <p className="text-app-xs text-muted-foreground">{t("portal.guestSend.optedOut")}</p> : null}
    </section>
  );
}
