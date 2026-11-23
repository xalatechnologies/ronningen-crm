export const SUBJECT_MIN = 3;
export const SUBJECT_MAX = 200;
export const BODY_MIN = 3;
export const BODY_MAX = 5000;

export type TicketTextError = "subject_min" | "subject_max" | "body_min" | "body_max";

/**
 * Checks the text of a ticket or a reply after trimming. The server uses this to refuse bad input, and the
 * forms use the same limits to keep Send off, so the two can never disagree.
 */
export function validateTicketText(input: { subject?: string; body: string }): TicketTextError | null {
  if (input.subject !== undefined) {
    const subject = input.subject.trim();
    if (subject.length < SUBJECT_MIN) return "subject_min";
    if (subject.length > SUBJECT_MAX) return "subject_max";
  }
  const body = input.body.trim();
  if (body.length < BODY_MIN) return "body_min";
  if (body.length > BODY_MAX) return "body_max";
  return null;
}
