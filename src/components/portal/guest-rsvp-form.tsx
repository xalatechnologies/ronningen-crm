"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { setReminders, submitRsvp } from "@/lib/portal/guest-public-actions";
import { DIET_TAGS, type DietTag } from "@/lib/portal/guest-rules";
import type { PublicInvite } from "@/lib/portal/guest-public";
import { DIET_NOTE_MAX, type RsvpAnswer } from "@/lib/portal/rsvp-rules";
import { cn } from "@/lib/utils";

type Person = { tags: DietTag[]; note: string };

export function GuestRsvpForm({ token, guest, closed, hostName }: { token: string; guest: PublicInvite["guest"]; closed: boolean; hostName: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const answered = guest.status !== "invited" && guest.status !== "not_sent";
  const [editing, setEditing] = useState(!answered && !closed);
  const [answer, setAnswer] = useState<RsvpAnswer | null>(answered ? (guest.status as RsvpAnswer) : null);
  const [party, setParty] = useState(Math.max(1, guest.partySize));
  const [people, setPeople] = useState<Person[]>(() =>
    Array.from({ length: guest.maxParty }, (_, i) => ({ tags: guest.diet[i]?.tags ?? [], note: guest.diet[i]?.note ?? "" })),
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [stopped, setStopped] = useState(guest.optedOut);

  const hasDiet = people.slice(0, party).some((p) => p.tags.length > 0 || p.note.trim() !== "");

  const setPerson = (index: number, patch: Partial<Person>) => setPeople((ps) => ps.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  // Functional update: two quick taps in one frame must both land.
  const toggleTag = (index: number, tag: DietTag) =>
    setPeople((ps) =>
      ps.map((p, i) => (i === index ? { ...p, tags: p.tags.includes(tag) ? p.tags.filter((x) => x !== tag) : [...p.tags, tag] } : p)),
    );

  async function save() {
    if (!answer) return;
    setBusy(true);
    setError(null);
    const result = await submitRsvp(token, {
      answer,
      partySize: answer === "accepted" ? party : 1,
      diet: answer === "accepted" ? people.slice(0, party) : [],
      consent,
    });
    setBusy(false);
    if (result.ok) {
      setJustSaved(true);
      setEditing(false);
      router.refresh();
      return;
    }
    setError(
      result.error === "consent_required"
        ? t("portal.guestPage.errConsent")
        : result.error === "party_too_large"
          ? t("portal.guestPage.errParty")
          : result.error === "rate_limited"
            ? t("portal.guestPage.errRate")
            : result.error === "deadline_passed"
              ? t("portal.guestPage.closed", { host: hostName })
              : t("portal.guestPage.errFailed"),
    );
  }

  async function toggleStop() {
    const next = !stopped;
    const r = await setReminders(token, next);
    if (r.ok) setStopped(next);
  }

  const options: { value: RsvpAnswer; label: string }[] = [
    { value: "accepted", label: t("portal.guestPage.yes") },
    { value: "declined", label: t("portal.guestPage.no") },
    { value: "maybe", label: t("portal.guestPage.maybe") },
  ];

  return (
    <section className="flex flex-col gap-5">
      {closed ? (
        <p className="rounded-2xl bg-amber-500/10 p-4 text-app-base ring-1 ring-amber-500/30">{t("portal.guestPage.closed", { host: hostName })}</p>
      ) : null}

      {!editing ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/8">
          {answered ? (
            <p className="flex items-center gap-2 font-heading text-lg font-semibold">
              <Check className="size-5 text-success" aria-hidden />
              {t(`portal.guests.status.${guest.status}` as TranslationKey)}
              {guest.status === "accepted" ? ` · ${t("portal.guestSend.answerParty", { count: guest.partySize })}` : ""}
            </p>
          ) : null}
          {justSaved ? <p className="font-semibold">{t("portal.guestPage.saved")}</p> : null}
          {!closed ? <p className="text-app-sm text-muted-foreground">{t("portal.guestPage.savedHint")}</p> : null}
          {!closed ? (
            <Button type="button" variant="outline" size="cta" onClick={() => { setEditing(true); setJustSaved(false); }}>
              {t("portal.guestPage.change")}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/8">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-heading text-lg font-semibold">{t("portal.guestPage.question")}</legend>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={answer === o.value}
                onClick={() => setAnswer(o.value)}
                className={cn(
                  "min-h-14 rounded-2xl px-5 text-left text-app-base font-semibold ring-1 transition-colors",
                  answer === o.value ? "bg-success text-white ring-success" : "bg-background ring-foreground/15 hover:ring-foreground/30",
                )}
              >
                {o.label}
              </button>
            ))}
          </fieldset>

          {answer === "accepted" ? (
            <>
              {guest.maxParty > 1 ? (
                <div className="flex flex-col gap-2">
                  <Label>{t("portal.guestPage.partyHow")}</Label>
                  <div className="flex items-center gap-4">
                    <Button type="button" variant="outline" size="icon" aria-label="−" disabled={party <= 1} onClick={() => setParty((p) => Math.max(1, p - 1))}>
                      <Minus className="size-5" aria-hidden />
                    </Button>
                    <span className="min-w-8 text-center font-heading text-2xl font-bold tabular-nums" aria-live="polite">{party}</span>
                    <Button type="button" variant="outline" size="icon" aria-label="+" disabled={party >= guest.maxParty} onClick={() => setParty((p) => Math.min(guest.maxParty, p + 1))}>
                      <Plus className="size-5" aria-hidden />
                    </Button>
                  </div>
                  <p className="text-app-xs text-muted-foreground">{t("portal.guestPage.partyUpTo", { count: guest.maxParty })}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">{t("portal.guestPage.dietTitle")}</h2>
                  <p className="text-app-sm text-muted-foreground">{t("portal.guestPage.dietHelp")}</p>
                </div>
                {people.slice(0, party).map((p, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-xl bg-background p-4 ring-1 ring-foreground/10">
                    {party > 1 ? <p className="text-app-sm font-semibold">{t("portal.guestPage.person", { n: i + 1 })}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      {DIET_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={p.tags.includes(tag)}
                          onClick={() => toggleTag(i, tag)}
                          className={cn(
                            "min-h-11 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors",
                            p.tags.includes(tag) ? "bg-success text-white ring-success" : "bg-card ring-foreground/15",
                          )}
                        >
                          {t(`portal.diet.tags.${tag}` as TranslationKey)}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`note-${i}`}>{t("portal.guestPage.noteLabel")}</Label>
                      <Textarea id={`note-${i}`} value={p.note} maxLength={DIET_NOTE_MAX} onChange={(e) => setPerson(i, { note: e.target.value })} className="!min-h-16 !text-base" />
                    </div>
                  </div>
                ))}
                {hasDiet ? (
                  <label className="flex items-start gap-3 text-app-sm">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0" />
                    <span>{t("portal.guestPage.consent")}</span>
                  </label>
                ) : null}
              </div>
            </>
          ) : null}

          {error ? <p className="text-app-sm font-medium text-destructive">{error}</p> : null}
          <Button type="button" variant="success" size="cta" disabled={!answer || busy} onClick={() => void save()}>
            {busy ? t("portal.guestPage.saving") : t("portal.guestPage.save")}
          </Button>
          <p className="text-center text-app-xs text-muted-foreground">{t("portal.guestPage.privacy")}</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-1 text-center">
        <button type="button" onClick={() => void toggleStop()} className="min-h-11 text-app-sm font-semibold text-muted-foreground underline underline-offset-2">
          {stopped ? t("portal.guestPage.resume") : t("portal.guestPage.stop")}
        </button>
        {stopped ? <p className="text-app-xs text-muted-foreground">{t("portal.guestPage.stopped")}</p> : null}
      </div>
    </section>
  );
}
