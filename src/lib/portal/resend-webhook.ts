import { createHmac, timingSafeEqual } from "node:crypto";

export type DeliveryEvent = {
  /** What the e-mail row records. */
  delivery: "delivered" | "delayed" | "bounced" | "complained";
  /** What the guest row shows the customer: null clears a problem. */
  issue: "delayed" | "bounced" | null;
};

const EVENTS: Record<string, DeliveryEvent> = {
  "email.delivered": { delivery: "delivered", issue: null },
  "email.delivery_delayed": { delivery: "delayed", issue: "delayed" },
  "email.bounced": { delivery: "bounced", issue: "bounced" },
  "email.complained": { delivery: "complained", issue: "bounced" },
};

/** The delivery meaning of a Resend event type, or null for events we do not track (sent, opened, clicked ...). */
export function deliveryFromEvent(type: string): DeliveryEvent | null {
  return EVENTS[type] ?? null;
}

/**
 * A late "delayed" must not overwrite "delivered" or "bounced", and "bounced" must not be undone by a later
 * "delayed". Returns whether the new event should be applied to a row currently in `current`.
 */
export function shouldApplyDelivery(current: string | null, next: DeliveryEvent["delivery"]): boolean {
  if (next === "delayed") return current === null || current === "delayed";
  return true;
}

const TOLERANCE_SECONDS = 5 * 60;

/** Resend signs webhooks with Svix: HMAC-SHA256 over "id.timestamp.body", key = base64 part of "whsec_...". */
export function verifyResendSignature(input: {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  secret: string;
  now?: number;
}): boolean {
  const { id, timestamp, signature, body, secret } = input;
  if (!id || !timestamp || !signature) return false;
  const seconds = Number(timestamp);
  const now = Math.floor((input.now ?? Date.now()) / 1000);
  if (!Number.isFinite(seconds) || Math.abs(now - seconds) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
