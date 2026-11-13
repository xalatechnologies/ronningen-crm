"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { SendHorizontal } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import type { SendMessageResult } from "@/lib/portal/messages-actions";
import { MESSAGE_MAX_LENGTH, type PortalMessage } from "@/lib/portal/messages-rules";
import { cn } from "@/lib/utils";

type Viewer = "customer" | "staff";

/** The booking's one conversation. Used by the customer portal and the venue page; text only, never HTML. */
export function MessageThread({
  viewer,
  messages,
  send,
  markRead,
  stickyOffsetClassName = "bottom-0",
  roomy = false,
}: {
  viewer: Viewer;
  messages: PortalMessage[];
  send: (body: string) => Promise<SendMessageResult>;
  markRead: () => Promise<void>;
  /** Where the composer sticks: the customer portal lifts it above its bottom tab bar on phones. */
  stickyOffsetClassName?: string;
  /** Venue workspace: the conversation sits in one large card with its composer. */
  roomy?: boolean;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const otherKind = viewer === "customer" ? "staff" : "customer";
  const unread = messages.some(
    (m) => m.senderKind === otherKind && !(viewer === "customer" ? m.readByCustomerAt : m.readByStaffAt),
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Keep the latest callback in a ref so a new function identity per render never retriggers the effect.
  const markReadRef = useRef(markRead);
  useEffect(() => {
    markReadRef.current = markRead;
  });
  useEffect(() => {
    if (unread) void markReadRef.current();
  }, [unread]);

  // Pick up new messages when the tab regains focus (realtime comes later).
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    setError(null);
    const result = await send(body);
    setBusy(false);
    if (result.ok) {
      setBody("");
      router.refresh();
      return;
    }
    setError(
      result.error === "invalid"
        ? t("portal.messages.tooLong")
        : result.error === "rate_limited"
          ? t("portal.messages.rateLimited")
          : t("portal.messages.failed"),
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit();
  }

  const dayFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
  const timeFormat = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  let lastDay = "";

  return (
    <div
      className={cn(
        "flex min-h-[calc(100svh-20rem)] flex-col gap-4 sm:min-h-0",
        roomy && "min-h-[32rem] gap-0 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8 sm:min-h-[32rem]",
      )}
    >
      <ol className={cn("flex min-h-40 flex-1 flex-col gap-3", roomy && "max-h-[60vh] gap-5 overflow-y-auto p-5 sm:p-6")} aria-live="polite">
        {messages.length === 0 ? (
          <li className="rounded-2xl bg-card px-6 py-10 text-center text-app-base text-muted-foreground ring-1 ring-foreground/8">
            {t("portal.messages.empty")}
          </li>
        ) : null}
        {messages.map((m) => {
          const day = dayFormat.format(new Date(m.createdAt));
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.senderKind === viewer;
          return (
            <li key={m.id} className="flex flex-col gap-3">
              {showDay ? (
                <p className="self-center text-app-xs font-medium text-muted-foreground">{day}</p>
              ) : null}
              <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
                <p className="text-app-xs text-muted-foreground">
                  {mine ? t("portal.messages.you") : m.senderName} · {timeFormat.format(new Date(m.createdAt))}
                </p>
                <p
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-app-base",
                    roomy && "max-w-[75%] px-5 py-3.5 text-[1.0625rem] leading-relaxed",
                    mine
                      ? "rounded-br-md bg-success !text-white"
                      : roomy
                        ? "rounded-bl-md bg-muted/70"
                        : "rounded-bl-md bg-card ring-1 ring-foreground/8",
                  )}
                >
                  {m.body}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>

      <form
        onSubmit={(e) => void submit(e)}
        className={cn(
          "sticky z-10 -mx-4 flex flex-col gap-2 border-t border-foreground/8 bg-background/95 px-4 pt-3 backdrop-blur sm:-mx-0 sm:rounded-2xl sm:border sm:px-3 sm:pb-3",
          stickyOffsetClassName,
          roomy && "static mx-0 rounded-none border-0 border-t bg-card px-5 py-4 backdrop-blur-none sm:rounded-none sm:border-0 sm:border-t sm:px-6",
        )}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MESSAGE_MAX_LENGTH}
            rows={1}
            placeholder={t("portal.messages.placeholder")}
            aria-label={t("portal.messages.placeholder")}
            className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl px-4 py-3 !text-base"
          />
          <button
            type="submit"
            disabled={busy || !body.trim()}
            aria-label={busy ? t("portal.messages.sending") : t("portal.messages.send")}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success text-white transition-opacity disabled:opacity-40"
          >
            <SendHorizontal className="size-5" aria-hidden />
          </button>
        </div>
        {error ? <p className="text-app-sm font-medium text-destructive">{error}</p> : null}
      </form>
    </div>
  );
}
