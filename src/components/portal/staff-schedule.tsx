"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ScheduleTimeline } from "@/components/portal/schedule-timeline";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { ScheduleVersion } from "@/lib/portal/schedule";
import { acknowledgeSchedule } from "@/lib/portal/schedule-actions";

/** The venue's read-only view of the plan the customer chose to share. Never shows the working copy. */
export function StaffSchedule({ bookingId, versions }: { bookingId: string; versions: ScheduleVersion[] }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [selected, setSelected] = useState(versions[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  if (versions.length === 0) {
    return <p className="rounded-2xl bg-card px-6 py-10 text-center text-muted-foreground ring-1 ring-foreground/8">{t("portal.staffSchedule.empty")}</p>;
  }
  const version = versions.find((v) => v.id === selected) ?? versions[0];

  async function acknowledge() {
    setBusy(true);
    const result = await acknowledgeSchedule({ bookingId, versionId: version.id, note });
    setBusy(false);
    if (result.ok) {
      toast.success(t("portal.staffSchedule.saved"));
      setNote("");
    } else toast.error(t("portal.staffSchedule.failed"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="flex flex-wrap items-center gap-2 font-heading text-lg font-bold">
              {t("portal.staffSchedule.version", { version: version.version })}
              <span
                className={`rounded-full px-2.5 py-0.5 font-sans text-app-xs font-semibold ${version.acknowledgedAt ? "bg-success/15 text-success" : "bg-amber-500/15 text-amber-800 dark:text-amber-300"}`}
              >
                {version.acknowledgedAt ? t("portal.staffSchedule.chipAcked") : t("portal.staffSchedule.chipWaiting")}
              </span>
            </p>
            <p className="text-app-sm text-muted-foreground">
              {t("portal.staffSchedule.sharedAt", { date: fmt.format(new Date(version.sharedAt)) })} · {t("portal.staffSchedule.count", { count: version.items.length })}
            </p>
          </div>
          {versions.length > 1 ? (
            <select
              aria-label={t("portal.staffSchedule.version", { version: version.version })}
              value={version.id}
              onChange={(e) => setSelected(e.target.value)}
              className="h-11 rounded-[length:var(--app-radius)] border border-input bg-transparent px-3 text-app-sm"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {t("portal.staffSchedule.version", { version: v.version })}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {version.acknowledgedAt ? (
          <div className="rounded-xl bg-success/10 p-3 text-app-sm">
            <p className="font-semibold">{t("portal.staffSchedule.ackedAt", { date: fmt.format(new Date(version.acknowledgedAt)) })}</p>
            {version.staffNote ? <p className="mt-1">{version.staffNote}</p> : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-amber-500/10 p-3">
            <p className="text-app-sm font-semibold">{t("portal.staffSchedule.waiting")}</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ack-note">{t("portal.staffSchedule.noteLabel")}</Label>
              <Textarea id="ack-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className="!min-h-20 !text-base" />
            </div>
            <Button type="button" variant="success" className="w-fit" disabled={busy} onClick={() => void acknowledge()}>
              {t("portal.staffSchedule.ack")}
            </Button>
          </div>
        )}
      </section>

      <ScheduleTimeline entries={version.items} />
    </div>
  );
}
