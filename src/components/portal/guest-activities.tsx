"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/i18n/client";
import { answerActivity } from "@/lib/portal/guest-public-actions";
import { canAnswer, formatOslo, type ActivityResponse } from "@/lib/portal/activity-rules";
import type { GuestActivity } from "@/lib/portal/activities";
import { cn } from "@/lib/utils";

/** The guest's activities: one tap to say yes, no or maybe. Counts only, never other guests' names. */
export function GuestActivities({ token, activities }: { token: string; activities: GuestActivity[] }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (activities.length === 0) return null;

  async function answer(activityId: string, response: ActivityResponse) {
    setBusy(`${activityId}:${response}`);
    setError(null);
    const r = await answerActivity(token, activityId, response);
    setBusy(null);
    if (!r.ok) setError(r.error === "full" ? t("portal.guestPage.actErrFull") : r.error === "closed" ? t("portal.guestPage.actErrClosed") : t("portal.guestPage.actErrGeneric"));
    router.refresh();
  }

  const options: { value: ActivityResponse; label: string }[] = [
    { value: "yes", label: t("portal.guestPage.actYes") },
    { value: "maybe", label: t("portal.guestPage.actMaybe") },
    { value: "no", label: t("portal.guestPage.actNo") },
  ];

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/8">
      <div>
        <h2 className="font-heading text-lg font-semibold">{t("portal.guestPage.activitiesTitle")}</h2>
        <p className="text-app-sm text-muted-foreground">{t("portal.guestPage.activitiesHelp")}</p>
      </div>
      <ul className="flex flex-col gap-4">
        {activities.map(({ activity: a, myResponse, yesPeople, spotsLeft }) => {
          const open = canAnswer(a);
          const full = spotsLeft === 0 && myResponse !== "yes";
          return (
            <li key={a.id} className="flex flex-col gap-2 rounded-xl bg-background p-4 ring-1 ring-foreground/10">
              <p className="break-words font-semibold">{a.title}</p>
              <p className="text-app-sm text-muted-foreground">
                {formatOslo(a.startsAt, locale)}
                {a.location ? ` · ${a.location}` : ""}
              </p>
              {a.description ? <p className="whitespace-pre-wrap break-words text-app-sm">{a.description}</p> : null}
              <p className="text-app-xs text-muted-foreground">
                {yesPeople > 0 ? t("portal.guestPage.actGoing", { count: yesPeople }) : ""}
                {spotsLeft !== null ? `${yesPeople > 0 ? " · " : ""}${spotsLeft === 0 ? t("portal.guestPage.actFull") : t("portal.guestPage.actSpots", { left: spotsLeft })}` : ""}
              </p>
              {open ? (
                <div className="grid grid-cols-3 gap-2" role="group">
                  {options.map((o) => {
                    const disabled = busy !== null || (o.value === "yes" && full);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={myResponse === o.value}
                        disabled={disabled}
                        onClick={() => void answer(a.id, o.value)}
                        className={cn(
                          "min-h-12 rounded-xl text-app-sm font-semibold ring-1 transition-colors disabled:opacity-50",
                          myResponse === o.value ? "bg-success text-white ring-success" : "bg-card ring-foreground/15",
                        )}
                      >
                        {o.value === "yes" && full ? t("portal.guestPage.actFull") : o.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-app-sm font-semibold text-muted-foreground">{t("portal.guestPage.actEnded")}</p>
              )}
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-app-sm font-medium text-destructive">{error}</p> : null}
    </section>
  );
}
