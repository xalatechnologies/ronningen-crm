"use client";

import { Mail, Send, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PORTAL_SHEET } from "@/components/portal/sheet-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { sendGuestMessage } from "@/lib/portal/guest-message-actions";
import {
  containsLink,
  MESSAGE_BODY_MAX,
  MESSAGE_SUBJECT_MAX,
  messageRecipients,
  type MessageAudience,
} from "@/lib/portal/guest-message-rules";
import type { GuestMessageRow, MessageActivity } from "@/lib/portal/guest-messages";
import type { GuestRow } from "@/lib/portal/guest-rules";

export type MessagingState = { history: GuestMessageRow[]; activities: MessageActivity[] };

const AUDIENCE_LABEL: Record<Exclude<MessageAudience, "activity">, TranslationKey> = {
  all: "portal.guestMessage.audAll",
  accepted: "portal.guestMessage.audAccepted",
  noAnswer: "portal.guestMessage.audNoAnswer",
  maybe: "portal.guestMessage.audMaybe",
};

/** The customer writes one message and picks which guests get it; a second step confirms the number. */
export function GuestMessageSheet({
  open,
  onOpenChange,
  guests,
  messaging,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: GuestRow[];
  messaging: MessagingState;
}) {
  const { t, formatDateTime } = useTranslation();
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<MessageAudience>("all");
  const [activityId, setActivityId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const activityGuests = useMemo(() => {
    const found = messaging.activities.find((a) => a.id === activityId);
    return found ? new Set(found.guestIds) : null;
  }, [messaging.activities, activityId]);
  const counts = useMemo(() => {
    const count = (a: MessageAudience, set: ReadonlySet<string> | null = null) => messageRecipients(guests, a, set).length;
    return { all: count("all"), accepted: count("accepted"), noAnswer: count("noAnswer"), maybe: count("maybe") };
  }, [guests]);
  const recipients = messageRecipients(guests, audience, activityGuests).length;

  const hasLink = containsLink(subject) || containsLink(body);
  const ready = subject.trim() !== "" && body.trim() !== "" && !hasLink && recipients > 0 && (audience !== "activity" || activityId !== "");

  function close(next: boolean) {
    if (!next) setConfirming(false);
    onOpenChange(next);
  }

  async function send() {
    setBusy(true);
    const r = await sendGuestMessage({ subject, body, audience, activityId: audience === "activity" ? activityId : null });
    setBusy(false);
    if (!r.ok) {
      setConfirming(false);
      toast.error(
        r.error === "limit"
          ? t("portal.guestMessage.limit")
          : r.error === "nobody"
            ? t("portal.guestMessage.nobody")
            : r.error === "links" || r.error === "invalid"
              ? r.error === "links"
                ? t("portal.guestMessage.noLinks")
                : t("portal.guestMessage.invalid")
              : r.error === "disabled"
                ? t("portal.guestSend.disabled")
                : r.error === "no_design"
                  ? t("portal.guestSend.needDesign")
                  : t("portal.guestSend.failed"),
      );
      return;
    }
    toast.success(r.failed > 0 ? t("portal.guestMessage.sentPartial", { sent: r.sent, failed: r.failed }) : t("portal.guestMessage.sent", { count: r.sent }));
    setSubject("");
    setBody("");
    setAudience("all");
    setActivityId("");
    close(false);
    router.refresh();
  }

  const audienceChip =
    "flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-2xl border border-gold/40 bg-card px-4 py-2 text-app-sm font-semibold transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:ring-2 has-[:checked]:ring-primary/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring";
  const countBadge = "rounded-full bg-foreground/8 px-2 py-0.5 text-app-xs tabular-nums";

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="bottom" className={`${PORTAL_SHEET} max-h-[92dvh] overflow-y-auto`}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="size-5" />
            </span>
            {confirming ? t("portal.guestMessage.confirmTitle") : t("portal.guestMessage.title")}
          </SheetTitle>
        </SheetHeader>
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-2 lg:max-w-4xl">
          {confirming ? (
            <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
              <p className="flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 font-semibold">
                <Users className="size-5 shrink-0 text-primary" aria-hidden />
                {t("portal.guestMessage.confirmBody", { count: recipients })}
              </p>
              <div className="flex flex-col gap-2 rounded-2xl border border-gold/40 bg-card p-4">
                <p className="break-words font-serif text-xl font-semibold">{subject.trim()}</p>
                <p className="whitespace-pre-wrap break-words text-muted-foreground">{body.trim()}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="success" size="cta" className="flex-1" disabled={busy} onClick={() => void send()}>
                  <Send className="size-5" aria-hidden />
                  {t("portal.guestSend.confirm")}
                </Button>
                <Button type="button" variant="outline" size="cta" disabled={busy} onClick={() => setConfirming(false)}>
                  {t("portal.guestMessage.edit")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground">{t("portal.guestMessage.lead")}</p>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="gm-subject">{t("portal.guestMessage.subject")}</Label>
                    <Input id="gm-subject" value={subject} maxLength={MESSAGE_SUBJECT_MAX} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="gm-body">{t("portal.guestMessage.body")}</Label>
                    <Textarea id="gm-body" rows={7} value={body} maxLength={MESSAGE_BODY_MAX} onChange={(e) => setBody(e.target.value)} />
                    <p className="flex justify-between gap-3 text-app-xs text-muted-foreground">
                      <span className={hasLink ? "font-semibold text-destructive" : undefined}>{hasLink ? t("portal.guestMessage.noLinks") : null}</span>
                      <span className="tabular-nums">
                        {body.length} / {MESSAGE_BODY_MAX}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 font-semibold">{t("portal.guestMessage.audience")}</legend>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                      {(Object.keys(AUDIENCE_LABEL) as (keyof typeof AUDIENCE_LABEL)[]).map((id) => (
                        <label key={id} className={audienceChip}>
                          <input type="radio" name="gm-audience" className="sr-only" checked={audience === id} disabled={counts[id] === 0} onChange={() => setAudience(id)} />
                          <span>{t(AUDIENCE_LABEL[id])}</span>
                          <span className={countBadge}>{counts[id]}</span>
                        </label>
                      ))}
                      {messaging.activities.length > 0 ? (
                        <label className={`${audienceChip} col-span-2 lg:col-span-1`}>
                          <input type="radio" name="gm-audience" className="sr-only" checked={audience === "activity"} onChange={() => setAudience("activity")} />
                          <span>{t("portal.guestMessage.audActivity")}</span>
                        </label>
                      ) : null}
                    </div>
                    {audience === "activity" ? (
                      <div role="radiogroup" aria-label={t("portal.guestMessage.pickActivity")} className="ml-3 flex flex-col gap-2 border-l-2 border-gold/40 pl-3">
                        {messaging.activities.map((a) => (
                          <label key={a.id} className={audienceChip}>
                            <input type="radio" name="gm-activity" className="sr-only" checked={activityId === a.id} disabled={a.guestIds.length === 0} onChange={() => setActivityId(a.id)} />
                            <span className="min-w-0 break-words">{a.title}</span>
                            <span className={countBadge}>{a.guestIds.length}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </fieldset>

                  {messaging.history.length > 0 ? (
                    <details className="group rounded-2xl border border-gold/30 bg-card px-4 py-3">
                      <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 font-semibold">
                        {t("portal.guestMessage.history")}
                        <span className={countBadge}>{messaging.history.length}</span>
                      </summary>
                      <ul className="mt-3 flex flex-col gap-2">
                        {messaging.history.map((m) => (
                          <li key={m.id} className="flex flex-col rounded-xl bg-foreground/5 px-3 py-2 text-app-sm">
                            <span className="break-words font-semibold">{m.subject}</span>
                            <span className="text-muted-foreground">
                              {formatDateTime(m.createdAt)} · {t("portal.guestMessage.historyCount", { count: m.recipientCount })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-2 lg:ml-auto lg:w-full lg:max-w-md">
                <Button type="button" variant="success" size="cta" className="flex-1" disabled={!ready} onClick={() => setConfirming(true)}>
                  <Send className="size-5" aria-hidden />
                  {t("portal.guestMessage.send", { count: recipients })}
                </Button>
                <Button type="button" variant="outline" size="cta" onClick={() => close(false)}>
                  {t("portal.guests.cancel")}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
