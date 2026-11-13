"use client";

import { ClipboardPaste, MessageSquareText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

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
import { MAX_PARTY, parseGuestPaste, summarizeGuests, type GuestRow, type GuestStatus } from "@/lib/portal/guest-rules";
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

  const summary = useMemo(() => summarizeGuests(guests), [guests]);
  const groups = useMemo(() => {
    const labels = [...new Set(guests.map((g) => g.groupLabel).filter((l): l is string => Boolean(l)))].sort((a, b) => a.localeCompare(b));
    const sections = labels.map((label) => ({ label, rows: guests.filter((g) => g.groupLabel === label) }));
    const rest = guests.filter((g) => !g.groupLabel);
    if (rest.length > 0) sections.push({ label: "", rows: rest });
    return sections;
  }, [guests]);

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

  return (
    <div className="flex flex-col gap-6">
      {guests.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-foreground/8">
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
          <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
            <p className="font-heading text-2xl font-bold">{t("portal.guests.countLine", { count: summary.total })}</p>
            {summary.invited === 0 ? (
              <p className="text-app-sm text-muted-foreground">{t("portal.guests.comingSoon")}</p>
            ) : (
              <ul className="flex flex-wrap gap-2 text-app-sm font-semibold">
                <li className="rounded-full bg-success/15 px-3 py-1">{t("portal.guests.summaryComing", { count: summary.acceptedPeople })}</li>
                <li className="rounded-full bg-destructive/12 px-3 py-1">{t("portal.guests.summaryDeclined", { count: summary.declined })}</li>
                <li className="rounded-full bg-sky-500/15 px-3 py-1">{t("portal.guests.summaryMaybe", { count: summary.maybe })}</li>
                <li className="rounded-full bg-amber-500/15 px-3 py-1">{t("portal.guests.summaryNoAnswer", { count: summary.noAnswer })}</li>
              </ul>
            )}
          </section>

          {groups.map((section) => (
            <section key={section.label || "_"} className="flex flex-col gap-3">
              {section.label ? <h2 className="font-heading text-lg font-semibold">{section.label}</h2> : groups.length > 1 ? <h2 className="font-heading text-lg font-semibold">—</h2> : null}
              <ul className="divide-y divide-foreground/8 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
                {section.rows.map((g) => (
                  <li key={g.id}>
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
                      <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-app-xs font-semibold", TONE[g.status])}>
                        {t(`portal.guests.status.${g.status}` as TranslationKey)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="cta" className="w-full" onClick={() => setSheet({ ...emptyDraft })}>
              <Plus className="size-5" aria-hidden />
              {t("portal.guests.add")}
            </Button>
            <Button type="button" variant="outline" size="cta" className="w-full" onClick={() => setImporting(true)}>
              <ClipboardPaste className="size-5" aria-hidden />
              {t("portal.guests.importList")}
            </Button>
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirmAll(true)}>
              {t("portal.guests.deleteAll")}
            </Button>
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
        <SheetContent side="bottom">
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
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
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
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
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
                router.refresh();
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={confirmAll} onOpenChange={setConfirmAll}>
        <SheetContent side="bottom">
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
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="g-party">{t("portal.guests.fieldMaxParty")}</Label>
          <select
            id="g-party"
            value={form.maxParty}
            onChange={(e) => set("maxParty", e.target.value)}
            className="h-12 rounded-[length:var(--app-radius)] border border-input bg-transparent px-3 text-base"
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
          <Input id="g-phone" type="tel" inputMode="tel" value={form.phone} maxLength={30} onChange={(e) => set("phone", e.target.value)} className="h-12 !text-base" autoComplete="off" />
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
    <section className={cn("mx-auto mb-5 flex w-full max-w-lg flex-col gap-4 rounded-2xl p-5 ring-1", PANEL[guest.status])}>
      <h3 className="text-app-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("portal.guestSend.answerTitle")}</h3>
      {!answered ? (
        <p className="text-app-base text-muted-foreground">{t("portal.guestSend.answerNotYet")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("rounded-full px-4 py-1.5 font-heading text-xl font-bold", guest.status === "accepted" ? "bg-success !text-white" : TONE[guest.status])}>{t(`portal.guests.status.${guest.status}` as TranslationKey)}</span>
            {guest.status === "accepted" ? <span className="font-heading text-xl font-bold">{partyLabel(t, guest.partySize)}</span> : null}
          </div>
          {guest.status === "accepted" ? (
            people.length === 0 ? (
              <p className="text-app-base text-muted-foreground">{t("portal.guestSend.answerNoDiet")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {people.map(({ p, i }) => (
                  <li key={i} className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/8">
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
                    {p.note ? <span className="break-words border-l-4 border-foreground/15 pl-3 text-app-base italic">{p.note}</span> : null}
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
