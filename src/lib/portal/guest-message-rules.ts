import { z } from "zod";

import type { SendCandidate } from "./rsvp-rules";

export const MESSAGE_SUBJECT_MAX = 80;
export const MESSAGE_BODY_MAX = 2000;
/** Free-text messages per booking per 24 hours. The database enforces it too (portal_claim_guest_message). */
export const MAX_DAILY_MESSAGES = 3;

export const MESSAGE_AUDIENCES = ["all", "accepted", "noAnswer", "maybe", "activity"] as const;
export type MessageAudience = (typeof MESSAGE_AUDIENCES)[number];

/** A link in free text is a phishing risk (same rule as the card text and diet notes), so it is rejected. */
const LINK = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|no|net|org|io|app|me|ly|co)\b)/i;
// eslint-disable-next-line no-control-regex -- control characters (except tab and line breaks) have no place in a message
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export const guestMessageSchema = z
  .object({
    subject: z.string().trim().min(1).max(MESSAGE_SUBJECT_MAX),
    body: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
    audience: z.enum(MESSAGE_AUDIENCES),
    activityId: z.string().uuid().nullable(),
  })
  .refine((v) => (v.audience === "activity") === (v.activityId !== null), { message: "activity" })
  .refine((v) => !CONTROL.test(v.subject) && !CONTROL.test(v.body), { message: "characters" })
  .refine((v) => !v.subject.includes("\n"), { message: "subject" });
export type GuestMessageInput = z.input<typeof guestMessageSchema>;

export function containsLink(text: string): boolean {
  return LINK.test(text);
}

/** Line breaks are kept, runs of blank lines are collapsed, and Windows line endings become plain ones. */
export function normalizeMessageBody(body: string): string {
  return body.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Who a message reaches: guests with an address who have not stopped e-mails. "noAnswer" means invited but
 * not answered (a guest who was never invited has not been told about the event yet). The database applies
 * the same rules when it claims the recipients, so this is only what the screen shows.
 */
export function messageRecipients(
  guests: readonly Pick<SendCandidate, "id" | "email" | "status" | "optedOut">[],
  audience: MessageAudience,
  activityGuestIds: ReadonlySet<string> | null,
): string[] {
  return guests
    .filter((g) => {
      if (!g.email || g.optedOut) return false;
      switch (audience) {
        case "all":
          return true;
        case "accepted":
          return g.status === "accepted";
        case "maybe":
          return g.status === "maybe";
        case "noAnswer":
          return g.status === "invited";
        case "activity":
          return activityGuestIds?.has(g.id) ?? false;
      }
    })
    .map((g) => g.id);
}
