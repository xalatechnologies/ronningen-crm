"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";
import type { FeedRow } from "@/lib/calendar/feed-actions";
import {
  disableCalendarFeed,
  enableCalendarFeed,
  rotateCalendarFeed,
} from "@/lib/calendar/feed-actions";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { CalendarClock, Copy, Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type Props = {
  organizationId: string;
  organizationName: string;
  initialFeed: FeedRow | null;
  origin: string;
};

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CalendarFeedPanel({
  organizationId,
  organizationName,
  initialFeed,
  origin,
}: Props) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [feed, setFeed] = useState<FeedRow | null>(initialFeed);
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();

  const feedUrl = useMemo(() => {
    if (!feed) return null;
    const clean = origin.replace(/\/$/, "");
    return `${clean}/api/calendar/${feed.token}/bookings.ics`;
  }, [feed, origin]);

  const maskedUrl = useMemo(() => {
    if (!feedUrl) return "";
    if (revealed) return feedUrl;
    return feedUrl.replace(
      /calendar\/([^/]+)\//,
      (_, tok: string) => `calendar/${"•".repeat(Math.min(tok.length, 20))}/`,
    );
  }, [feedUrl, revealed]);

  function handleEnable() {
    startTransition(async () => {
      const result = await enableCalendarFeed(organizationId);
      if (!result.ok) {
        toast.error(t("settings.integrations.calendarFeed.enableFailed"), {
          description: result.error,
        });
        return;
      }
      setFeed(result.feed);
      setRevealed(true);
      toast.success(t("settings.integrations.calendarFeed.enabled"));
      router.refresh();
    });
  }

  function handleRotate() {
    if (
      !window.confirm(t("settings.integrations.calendarFeed.rotateConfirm"))
    ) {
      return;
    }
    startTransition(async () => {
      const result = await rotateCalendarFeed(organizationId);
      if (!result.ok) {
        toast.error(t("settings.integrations.calendarFeed.rotateFailed"), {
          description: result.error,
        });
        return;
      }
      setFeed(result.feed);
      setRevealed(true);
      toast.success(t("settings.integrations.calendarFeed.rotated"));
      router.refresh();
    });
  }

  function handleDisable() {
    if (
      !window.confirm(t("settings.integrations.calendarFeed.disableConfirm"))
    ) {
      return;
    }
    startTransition(async () => {
      const result = await disableCalendarFeed(organizationId);
      if (!result.ok) {
        toast.error(t("settings.integrations.calendarFeed.disableFailed"), {
          description: result.error,
        });
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

  return (
    <section
      className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6")}
      aria-labelledby="calendar-feed-heading"
    >
      <div className="flex items-start gap-3 border-b border-rn-border-strong/50 pb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rn-border-strong/70 bg-muted/30 text-muted-foreground">
          <CalendarClock className="size-5" aria-hidden />
        </div>
        <div>
          <h2
            id="calendar-feed-heading"
            className="font-heading text-lg font-semibold text-foreground md:text-xl"
          >
            {t("settings.integrations.calendarFeed.title")}
          </h2>
          <p className="mt-1 text-app-sm text-muted-foreground">
            {t("settings.integrations.calendarFeed.description", {
              org: organizationName,
            })}
          </p>
        </div>
      </div>

      {feed && feedUrl ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-md border border-rn-border-strong/60 bg-muted/20 p-4">
            <p className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("settings.integrations.calendarFeed.securityWarningTitle")}
            </p>
            <p className="mt-1.5 text-app-sm leading-relaxed text-muted-foreground">
              {t("settings.integrations.calendarFeed.securityWarningBody")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="calendar-feed-url"
              className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("settings.integrations.calendarFeed.urlLabel")}
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="calendar-feed-url"
                readOnly
                value={maskedUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="font-mono text-xs sm:text-sm"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRevealed((prev) => !prev)}
                  aria-pressed={revealed}
                >
                  {revealed ? (
                    <EyeOff className="mr-1.5 size-4" aria-hidden />
                  ) : (
                    <Eye className="mr-1.5 size-4" aria-hidden />
                  )}
                  {revealed
                    ? t("settings.integrations.calendarFeed.hide")
                    : t("settings.integrations.calendarFeed.reveal")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopy()}
                >
                  <Copy className="mr-1.5 size-4" aria-hidden />
                  {t("settings.integrations.calendarFeed.copy")}
                </Button>
              </div>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("settings.integrations.calendarFeed.createdAt")}
              </dt>
              <dd className="mt-1 text-app-sm text-foreground">
                {formatDateTime(feed.createdAt, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("settings.integrations.calendarFeed.rotatedAt")}
              </dt>
              <dd className="mt-1 text-app-sm text-foreground">
                {formatDateTime(feed.rotatedAt, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("settings.integrations.calendarFeed.lastAccessedAt")}
              </dt>
              <dd className="mt-1 text-app-sm text-foreground">
                {formatDateTime(feed.lastAccessedAt, locale)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-3 border-t border-rn-border-strong/50 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={handleRotate}
            >
              <RefreshCw className="mr-1.5 size-4" aria-hidden />
              {t("settings.integrations.calendarFeed.rotate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={handleDisable}
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 size-4" aria-hidden />
              {t("settings.integrations.calendarFeed.disable")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-app-sm text-muted-foreground">
            {t("settings.integrations.calendarFeed.emptyDescription")}
          </p>
          <div>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={handleEnable}
            >
              {pending
                ? t("settings.integrations.calendarFeed.enabling")
                : t("settings.integrations.calendarFeed.enable")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
