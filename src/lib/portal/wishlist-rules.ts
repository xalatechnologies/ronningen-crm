import { z } from "zod";

import { todayInOslo } from "./rsvp-rules";

export const WISH_CATEGORIES = ["food", "drink", "decoration", "furniture", "av", "cleaning", "other"] as const;
export type WishCategory = (typeof WISH_CATEGORIES)[number];

export const WISH_STATUSES = [
  "draft",
  "requested",
  "quoted",
  "countered",
  "approved",
  "declined",
  "withdrawn",
  "unavailable",
] as const;
export type WishStatus = (typeof WISH_STATUSES)[number];

export const MAX_COUNTER_ROUNDS = 3;
export const MAX_PRICE_NOK = 10_000_000;

type Actor = "customer" | "staff";

/**
 * Every allowed state change. Server actions check this AND apply it with a compare-and-set on the
 * current status, so two racing requests cannot both win.
 */
const TRANSITIONS: Record<Actor, Partial<Record<WishStatus, readonly WishStatus[]>>> = {
  customer: {
    draft: ["requested"],
    requested: ["withdrawn", "requested"], // requested -> requested = revise before a quote exists
    quoted: ["approved", "declined", "countered", "withdrawn", "requested"],
    countered: ["withdrawn", "requested"],
    unavailable: ["draft"],
    declined: ["draft"],
    withdrawn: ["draft"],
  },
  staff: {
    requested: ["quoted", "unavailable"],
    quoted: ["quoted", "unavailable"],
    countered: ["approved", "quoted", "unavailable"],
  },
};

export function canTransition(actor: Actor, from: WishStatus, to: WishStatus): boolean {
  return TRANSITIONS[actor][from]?.includes(to) ?? false;
}

/** A customer may counter while fewer than 3 counters have been made on the item and none is open. */
export function canCounter(input: { counterRounds: number; hasOpenCounter: boolean }): boolean {
  return !input.hasOpenCounter && input.counterRounds < MAX_COUNTER_ROUNDS;
}

/** Norwegian MVA rates a quote can use: general 25 %, food 15 %, 12 % (e.g. lodging, culture) and 0 % (exempt). */
export const VAT_RATES = [25, 15, 12, 0] as const;
export type VatRate = (typeof VAT_RATES)[number];

/** Food and (non-alcoholic) drinks are 15 %; everything else is the general 25 %. Alcohol is chosen by the venue. */
export function defaultVatRate(category: WishCategory): VatRate {
  return category === "food" || category === "drink" ? 15 : 25;
}

/** Price excluding MVA, the MVA amount and the price including MVA, from the quoted total and how it was entered. */
export function vatBreakdown(input: { totalNok: number; vatRate: number; vatIncluded: boolean }): { exVat: number; vat: number; incVat: number } {
  const factor = 1 + input.vatRate / 100;
  const incVat = input.vatIncluded ? input.totalNok : roundNok(input.totalNok * factor);
  const exVat = input.vatIncluded ? roundNok(input.totalNok / factor) : input.totalNok;
  return { exVat, vat: roundNok(incVat - exVat), incVat };
}

/** Money in NOK with 2 decimals; never floating-point drift in stored totals. */
export function roundNok(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function quoteTotalNok(unitPriceNok: number, quantity: number): number {
  return roundNok(unitPriceNok * quantity);
}

/** Accepts "1 250,50", "1250.5" and numbers; null when not a valid price. */
export function parsePriceInput(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? roundNok(raw) : null;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\s| /g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return roundNok(Number(cleaned));
}

const price = z
  .number()
  .min(0)
  .max(MAX_PRICE_NOK)
  .transform(roundNok);

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const wishItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(WISH_CATEGORIES),
  title: z.string().trim().min(1).max(120),
  description: text(1000).optional().default(null),
  quantity: z.number().gt(0).max(100000),
  unit: text(20).optional().default(null),
});
export type WishItemInput = z.input<typeof wishItemInputSchema>;

export const quoteInputSchema = z.object({
  bookingId: z.string().uuid(),
  itemId: z.string().uuid(),
  unitPriceNok: price,
  vatIncluded: z.boolean(),
  vatRate: z.union([z.literal(25), z.literal(15), z.literal(12), z.literal(0)]).optional().default(25),
  note: text(1000).optional().default(null),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .default(null),
});

export const counterInputSchema = z.object({
  itemId: z.string().uuid(),
  quoteId: z.string().uuid(),
  unitPriceNok: price,
  note: text(1000).optional().default(null),
});

/** Item as the UI sees it: the item plus its active quote and any open counter. */
export type WishItemView = {
  id: string;
  category: WishCategory;
  title: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  status: WishStatus;
  revision: number;
  counterRounds: number;
  quote: {
    id: string;
    unitPriceNok: number;
    totalNok: number;
    vatIncluded: boolean;
    vatRate: number;
    note: string | null;
    validUntil: string | null;
    source: "staff" | "counter";
  } | null;
  openCounter: { id: string; proposedUnitPriceNok: number; note: string | null } | null;
};

/** Sum of approved items at their active quote, including MVA: the "tillegg utenfor avtalen" total. */
export function approvedTotalNok(items: readonly WishItemView[]): number {
  return roundNok(
    items.reduce((sum, item) => (item.status === "approved" && item.quote ? sum + vatBreakdown(item.quote).incVat : sum), 0),
  );
}

/** Items waiting for the customer's answer (a price to approve, decline or counter). */
export function awaitingCustomer(items: readonly WishItemView[]): number {
  return items.filter((item) => item.status === "quoted").length;
}

/** Items waiting for the venue (requested, or a counter to answer). */
export function awaitingVenue(items: readonly WishItemView[]): number {
  return items.filter((item) => item.status === "requested" || item.status === "countered").length;
}

/** A quote is open on its "valid until" day and closed the day after (calendar date, Oslo time). */
export function quoteExpired(validUntil: string | null, now: Date = new Date()): boolean {
  return validUntil !== null && todayInOslo(now) > validUntil;
}
