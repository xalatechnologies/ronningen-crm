"use client";

import { CelebrationPopup } from "@/components/portal/celebration-popup";
import { useTranslation } from "@/i18n/client";
import type { RsvpAnswer } from "@/lib/portal/rsvp-rules";

export type RsvpReactionState = { answer: RsvpAnswer; id: number } | null;

/** The guest's reaction popup: confetti and a party face for yes, a sad face for no, a thinking face for maybe. */
export function RsvpReaction({ reaction, onDone }: { reaction: RsvpReactionState; onDone: () => void }) {
  const { t } = useTranslation();
  if (!reaction) return null;
  const copy = {
    accepted: { emoji: "🎉", title: t("portal.guestPage.reactYesTitle"), body: t("portal.guestPage.reactYesBody"), confetti: true },
    declined: { emoji: "😢", title: t("portal.guestPage.reactNoTitle"), body: t("portal.guestPage.reactNoBody"), confetti: false },
    maybe: { emoji: "🤔", title: t("portal.guestPage.reactMaybeTitle"), body: t("portal.guestPage.reactMaybeBody"), confetti: false },
  }[reaction.answer];
  return <CelebrationPopup celebration={{ id: reaction.id, ...copy }} onDone={onDone} />;
}
