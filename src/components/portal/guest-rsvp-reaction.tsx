"use client";

import { useEffect } from "react";

import { useTranslation } from "@/i18n/client";
import type { RsvpAnswer } from "@/lib/portal/rsvp-rules";

export type RsvpReactionState = { answer: RsvpAnswer; id: number } | null;

const CONFETTI = ["#8a2c52", "#c9a24a", "#e59aa8", "#93b186", "#f3e6c8", "#5e1f3d"];
const SHOW_MS = 2600;

/**
 * A short popup reaction to the guest's answer: confetti and a party face for yes, a sad face for no, a thinking
 * face for maybe. Decoration only (aria-live text carries the message), it ignores touches and goes away by
 * itself. People who asked their device for less motion get the popup without the animation.
 */
export function RsvpReaction({ reaction, onDone }: { reaction: RsvpReactionState; onDone: () => void }) {
  const { t } = useTranslation();
  const id = reaction?.id;

  useEffect(() => {
    if (id === undefined) return;
    const timer = window.setTimeout(onDone, SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [id, onDone]);

  if (!reaction) return null;
  const copy = {
    accepted: { emoji: "🎉", title: t("portal.guestPage.reactYesTitle"), body: t("portal.guestPage.reactYesBody") },
    declined: { emoji: "😢", title: t("portal.guestPage.reactNoTitle"), body: t("portal.guestPage.reactNoBody") },
    maybe: { emoji: "🤔", title: t("portal.guestPage.reactMaybeTitle"), body: t("portal.guestPage.reactMaybeBody") },
  }[reaction.answer];

  return (
    <div key={reaction.id} role="status" aria-live="polite" className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-6">
      <style>{`
        @keyframes rsvp-pop { 0% { opacity: 0; transform: scale(.6) translateY(12px); } 18% { opacity: 1; transform: scale(1.06); } 28% { transform: scale(1); } 85% { opacity: 1; } 100% { opacity: 0; transform: scale(.96) translateY(-8px); } }
        @keyframes rsvp-fall { 0% { opacity: 0; transform: translateY(-12vh) rotate(0deg); } 10% { opacity: 1; } 100% { opacity: 0; transform: translateY(70vh) rotate(540deg); } }
        @keyframes rsvp-bounce { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-10px); } }
        .rsvp-pop { animation: rsvp-pop ${SHOW_MS}ms ease-out both; }
        .rsvp-emoji { animation: rsvp-bounce 700ms ease-in-out 250ms 2; display: inline-block; }
        .rsvp-confetti { animation-name: rsvp-fall; animation-timing-function: ease-in; animation-fill-mode: both; }
        @media (prefers-reduced-motion: reduce) { .rsvp-pop, .rsvp-emoji { animation: none; } .rsvp-confetti { display: none; } }
      `}</style>
      {reaction.answer === "accepted"
        ? Array.from({ length: 30 }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="rsvp-confetti absolute top-0 block"
              style={{
                left: `${(i * 37) % 100}%`,
                width: i % 3 === 0 ? 9 : 7,
                height: i % 3 === 0 ? 14 : 9,
                borderRadius: i % 4 === 0 ? 9999 : 2,
                background: CONFETTI[i % CONFETTI.length],
                animationDelay: `${(i % 8) * 70}ms`,
                animationDuration: `${1500 + (i % 5) * 260}ms`,
              }}
            />
          ))
        : null}
      <div className="rsvp-pop flex max-w-xs flex-col items-center gap-2 rounded-3xl bg-card px-8 py-6 text-center shadow-[0_20px_60px_-12px_rgba(138,44,82,0.5)] ring-1 ring-gold/60">
        <span aria-hidden className="rsvp-emoji text-6xl leading-none">
          {copy.emoji}
        </span>
        <p className="font-serif text-2xl font-semibold">{copy.title}</p>
        <p className="text-app-sm text-muted-foreground">{copy.body}</p>
      </div>
    </div>
  );
}
