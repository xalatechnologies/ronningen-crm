import { z } from "zod";

import { containsLink } from "./invite-rules";
import { todayInOslo } from "./rsvp-rules";

export const GIFT_KINDS = ["gift", "other"] as const;
export type GiftKind = (typeof GIFT_KINDS)[number];

/** When the couple may see WHO gave a gift. Default: after the event date, so the surprise survives. */
export const REVEAL_MODES = ["event_date", "never", "now"] as const;
export type RevealMode = (typeof REVEAL_MODES)[number];
export const DEFAULT_REVEAL_MODE: RevealMode = "event_date";

export const MAX_GIFT_WISHES = 100;
export const MAX_CLAIMS_PER_GUEST = 10;
export const GIFT_MIN_INTERVAL_MS = 1_000;
export const MAX_GIFT_ACTIONS = 200;
export const MAX_PRICE_NOK = 1_000_000;
/** How many of one wish the couple can ask for (6 wine glasses, a contribution many can give). */
export const MAX_GIFT_QUANTITY = 99;

/**
 * A link the couple pastes (shop page or image): https only, a real domain name, no login part, no IP
 * address, no look-alike (punycode) labels, no custom port. Returns the cleaned URL or null.
 */
export function safeHttpsUrl(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0 || value.length > 500 || /[\s<>"'`\\]/.test(value)) return null;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host.endsWith(".")) return null;
  if (host.split(".").some((label) => label.startsWith("xn--"))) return null;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  return u.toString();
}

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || safeHttpsUrl(v) !== null)
  .transform((v) => (v === null ? null : safeHttpsUrl(v)));

export const giftWishInputSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(GIFT_KINDS),
  title: z.string().trim().min(1).max(80).refine((v) => !containsLink(v)),
  url: optionalUrl,
  imageUrl: optionalUrl,
  priceNok: z.number().int().min(0).max(MAX_PRICE_NOK).nullable().optional().default(null),
  quantity: z.number().int().min(1).max(MAX_GIFT_QUANTITY).default(1),
  note: z.string().trim().max(300).refine((v) => !containsLink(v)).default(""),
});
export type GiftWishInput = z.input<typeof giftWishInputSchema>;

export const giftSettingsSchema = z.object({
  shared: z.boolean(),
  revealMode: z.enum(REVEAL_MODES),
});
export type GiftSettings = z.infer<typeof giftSettingsSchema>;

/** "1 200", "1200,-" or "1 200 kr" -> 1200; empty -> null; anything else -> undefined (invalid). */
export function parseGiftPrice(input: string): number | null | undefined {
  const cleaned = input.replace(/\s| |kr\.?|,-|nok/gi, "");
  if (cleaned === "") return null;
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(cleaned)) return undefined;
  const n = Math.round(Number(cleaned.replace(",", ".")));
  return n <= MAX_PRICE_NOK ? n : undefined;
}

/** May the couple see who gave what? `eventDate` is the booking's YYYY-MM-DD (null = not set, so not yet). */
export function giversVisible(mode: RevealMode, eventDate: string | null, now: Date = new Date()): boolean {
  if (mode === "now") return true;
  if (mode === "never") return false;
  return eventDate !== null && todayInOslo(now) > eventDate;
}

export function giftRateLimited(lastActionAt: string | null, actionCount: number, now: Date = new Date()): boolean {
  if (actionCount >= MAX_GIFT_ACTIONS) return true;
  return lastActionAt !== null && now.getTime() - new Date(lastActionAt).getTime() < GIFT_MIN_INTERVAL_MS;
}

export type GiftWish = {
  id: string;
  kind: GiftKind;
  title: string;
  url: string | null;
  imageUrl: string | null;
  priceNok: number | null;
  note: string;
  /** How many of it the couple wants; the wish stays available until that many guests have taken it. */
  quantity: number;
};

/** "1 200", "1" etc. -> a whole number 1..99; anything else -> undefined (invalid). */
export function parseGiftQuantity(input: string): number | undefined {
  const t = input.trim();
  if (!/^\d{1,2}$/.test(t)) return undefined;
  const n = Number(t);
  return n >= 1 && n <= MAX_GIFT_QUANTITY ? n : undefined;
}

/** What the couple sees: how many are taken, and the givers' names only when the setting allows it. */
export type CoupleGiftWish = GiftWish & { takenCount: number; giverNames: string[] };

export function toCoupleView(
  wishes: readonly GiftWish[],
  claims: ReadonlyMap<string, readonly string[]>,
  guestNames: ReadonlyMap<string, string>,
  showGivers: boolean,
): CoupleGiftWish[] {
  return wishes.map((w) => {
    const givers = claims.get(w.id) ?? [];
    return {
      ...w,
      takenCount: givers.length,
      giverNames: showGivers ? givers.map((id) => guestNames.get(id)).filter((n): n is string => Boolean(n)) : [],
    };
  });
}

/**
 * What a guest sees: "mine" if they took one, "taken" when every place is gone (and none is theirs), otherwise
 * "free" with how many places are left. Other givers are never named.
 */
export type GuestGiftWish = GiftWish & { state: "free" | "mine" | "taken"; left: number };

export function toGuestView(wishes: readonly GiftWish[], claims: ReadonlyMap<string, readonly string[]>, myGuestId: string): GuestGiftWish[] {
  return wishes.map((w) => {
    const givers = claims.get(w.id) ?? [];
    const left = Math.max(0, w.quantity - givers.length);
    return { ...w, left, state: givers.includes(myGuestId) ? "mine" : left === 0 ? "taken" : "free" };
  });
}
