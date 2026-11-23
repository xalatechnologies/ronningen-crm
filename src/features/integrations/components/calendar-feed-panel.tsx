"use client";

import { CalendarClock, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { CalendarSetupHelp } from "@/features/integrations/components/calendar-setup-help";
import { FeedUrlField } from "@/features/integrations/components/feed-url-field";
import { buildFeedUrl, formatFeedTime, maskFeedUrl } from "@/features/integrations/lib/feed-display";
import { useTranslation } from "@/i18n/client";
import type { FeedRow } from "@/lib/calendar/feed-actions";
import { disableCalendarFeed, enableCalendarFeed, rotateCalendarFeed } from "@/lib/calendar/feed-actions";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = {
  organizationId: string;
  organizationName: string;
  initialFeed: FeedRow | null;
  origin: string;
};

type Confirm = "rotate" | "disable" | null;

export function CalendarFeedPanel({ organizationId, organizationName, initialFeed, origin }: Props) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [feed, setFeed] = useState<FeedRow | null>(initialFeed);
  const [revealed, setRevealed] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pending, startTransition] = useTransition();

  const feedUrl = useMemo(() => (feed ? buildFeedUrl(origin, feed.token) : null), [feed, origin]);
  const displayValue = feedUrl ? (revealed ? feedUrl : maskFeedUrl(feedUrl)) : "";

  function handleEnable() {
    startTransition(async () => {
      const result = await enableCalendarFeed(organizationId);
      if (!result.ok) {
        toast.error(t("settings.integrations.calendarFeed.enableFailed"), { description: result.error });
        return;
      }
      setFeed(result.feed);
      setRevealed(true);
      toast.success(t("settings.integrations.calendarFeed.enabled"));
      router.refresh();
    });
  }

  function handleRotate() {
    startTransition(async () => {
      const result = await rotateCalendarFeed(organizationId);
      setConfirm(null);
      if (!result.ok) {
        toast.error(t("settings.integrations.calendarFeed.rotateFailed"), { description: result.error });
        return;
      }
      setFeed(result.feed);
      setRevealed(true);
      toast.success(t("settings.integrations.calendarFeed.rotated"));
      router.refresh();
    });
  }

  function handleDisable() {
    startTransition(async () => {
      const result = await disableCalendarFeed(organizationId);
      setConfirm(null);
      if (!result.ok) {
        toast.error(t("settings.integrations.calendarFeed.disableFailed"), { description: result.error });
        return;
      }
      setFeed(null);
      setRevealed(false);
      toast.success(t("settings.integrations.calendarFeed.disabled"));
      router.refresh();
    });
  }

  async function handleCopy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success(t("settings.integrations.calendarFeed.copied"));
    } catch {
      toast.error(t("settings.integrations.calendarFeed.copyFailed"));
    }
  }

  const never = t("settings.integrations.calendarFeed.never");
  const facts = feed
    ? [
        { label: t("settings.integrations.calendarFeed.createdAt"), value: formatFeedTime(feed.createdAt, locale) ?? never },
        { label: t("settings.integrations.calendarFeed.rotatedAt"), value: formatFeedTime(feed.rotatedAt, locale) ?? never },
        { label: t("settings.integrations.calendarFeed.lastAccessedAt"), value: formatFeedTime(feed.lastAccessedAt, locale) ?? never },
      ]
    : [];

  return (
    <section aria-labelledby="calendar-feed-heading" className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6")}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground ring-1 ring-foreground/10">
          <CalendarClock className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="calendar-feed-heading" className="font-heading text-lg font-semibold text-foreground md:text-xl">
            {t("settings.integrations.calendarFeed.title")}
          </h2>
          <p className="mt-1 text-app-sm text-muted-foreground">
            {t("settings.integrations.calendarFeed.description", { org: organizationName })}
          </p>
        </div>
        <StatusBadge tone={feed ? "success" : "neutral"}>
          {feed ? t("settings.integrations.calendarFeed.statusActive") : t("settings.integrations.calendarFeed.statusOff")}
        </StatusBadge>
      </div>

      {feed && feedUrl ? (
        <div className="flex flex-col gap-5">
          <FeedUrlField
            displayValue={displayValue}
            revealed={revealed}
            onToggleReveal={() => setRevealed((prev) => !prev)}
            onCopy={() => void handleCopy()}
          />

          <p className="flex items-start gap-2 text-app-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold text-foreground">{t("settings.integrations.calendarFeed.securityWarningTitle")}.</strong>{" "}
              {t("settings.integrations.calendarFeed.securityWarningBody")}
            </span>
          </p>

          <CalendarSetupHelp />

          <dl className="grid gap-4 border-t border-foreground/10 pt-5 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-app-xs font-semibold text-muted-foreground">{fact.label}</dt>
                <dd className="mt-1 text-app-sm text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-3 border-t border-foreground/10 pt-5">
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setConfirm("rotate")}>
              <RefreshCw className="size-4" aria-hidden />
              {t("settings.integrations.calendarFeed.rotate")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirm("disable")}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
              {t("settings.integrations.calendarFeed.disable")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-xl bg-muted/30 px-5 py-6">
          <p className="max-w-xl text-app-sm text-muted-foreground">{t("settings.integrations.calendarFeed.emptyDescription")}</p>
          <Button type="button" variant="success" disabled={pending} onClick={handleEnable}>
            {pending ? t("settings.integrations.calendarFeed.enabling") : t("settings.integrations.calendarFeed.enable")}
          </Button>
        </div>
      )}

      <ConfirmDeleteDialog
        open={confirm != null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm === "disable" ? t("settings.integrations.calendarFeed.disableTitle") : t("settings.integrations.calendarFeed.rotateTitle")}
        description={confirm === "disable" ? t("settings.integrations.calendarFeed.disableConfirm") : t("settings.integrations.calendarFeed.rotateConfirm")}
        confirmLabel={confirm === "disable" ? t("settings.integrations.calendarFeed.disable") : t("settings.integrations.calendarFeed.rotate")}
        busy={pending}
        onConfirm={confirm === "disable" ? handleDisable : handleRotate}
      />
    </section>
  );
}
