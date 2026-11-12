import { z } from "zod";

export const TEMPLATES = ["klassisk", "moderne", "ramme", "stripe"] as const;
export const PALETTE_KEYS = ["skog", "sand", "natt", "rose", "salvie", "kull"] as const;
export const FONT_KEYS = ["serif", "sans", "elegant"] as const;
export type TemplateKey = (typeof TEMPLATES)[number];
export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type FontKey = (typeof FONT_KEYS)[number];

export type Palette = { bg: string; ink: string; accent: string; muted: string };

/** Six calm palettes (no violet). Every ink/background pair meets WCAG AA for body text (tested). */
export const PALETTES: Record<PaletteKey, Palette> = {
  skog: { bg: "#1f3a2e", ink: "#f4efe4", accent: "#c9b27a", muted: "#c3ccbe" },
  sand: { bg: "#f3e9dc", ink: "#3b2a20", accent: "#a84a2f", muted: "#6b5646" },
  natt: { bg: "#14213d", ink: "#f5f1e8", accent: "#e0b45a", muted: "#b4bdd0" },
  rose: { bg: "#f6e6e4", ink: "#3a2a2c", accent: "#a84458", muted: "#6f585b" },
  salvie: { bg: "#e6ebe0", ink: "#26322a", accent: "#4d6b4a", muted: "#58665a" },
  kull: { bg: "#f7f5f1", ink: "#1d1d1b", accent: "#8c6a43", muted: "#5f5c56" },
};

/** Font stacks only: no webfont download, so the card renders instantly and offline. */
export const FONTS: Record<FontKey, { heading: string; body: string; headingStyle: "normal" | "italic"; headingWeight: number }> = {
  serif: {
    heading: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif",
    body: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
    headingStyle: "normal",
    headingWeight: 600,
  },
  sans: {
    heading: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
    body: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
    headingStyle: "normal",
    headingWeight: 800,
  },
  elegant: {
    heading: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif",
    body: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif",
    headingStyle: "italic",
    headingWeight: 500,
  },
};

/** URLs and bare domains in free text: blocked in v1 (phishing/spam abuse). The database blocks http(s):// and www. too. */
const BLOCKED_TLDS =
  "com|no|net|org|io|app|me|ly|info|biz|xyz|co|link|click|shop|site|online|store|top|club|live|tech|dev|page|bio|fun|work|cloud|pro|website|space|icu|vip|buzz|cc|tk|ml|ga|cf|gq|ru|cn|de|uk|eu|nu|se|dk|fi|tv|us|ca|au|in|name|mobi|support|help|bank|pay|secure|login|zip|mov|gle";

/** URLs and bare domains in free text: blocked in v1 (phishing/spam abuse). The database blocks http(s):// and www. too. */
export function containsLink(text: string): boolean {
  return /(https?:\/\/|www\.)/i.test(text) || new RegExp(`\\b[\\w-]+\\.(${BLOCKED_TLDS})\\b`, "i").test(text);
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !containsLink(value));

export const inviteDesignSchema = z.object({
  templateKey: z.enum(TEMPLATES),
  paletteKey: z.enum(PALETTE_KEYS),
  fontKey: z.enum(FONT_KEYS),
  headline: text(80),
  message: text(600),
  eventDateText: text(60),
  eventTimeText: text(40),
  placeText: text(120),
  dressCode: text(60),
  rsvpDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .default(null),
});
export type InviteDesignInput = z.input<typeof inviteDesignSchema>;
export type InviteDesign = z.output<typeof inviteDesignSchema> & { status: "draft" | "published"; publishedAt: string | null };

/** What a card needs before it may be published: a headline and when it happens. */
export function missingForPublish(d: Pick<InviteDesign, "headline" | "eventDateText">): ("headline" | "eventDateText")[] {
  const missing: ("headline" | "eventDateText")[] = [];
  if (d.headline.trim() === "") missing.push("headline");
  if (d.eventDateText.trim() === "") missing.push("eventDateText");
  return missing;
}

/** Sensible starting values from the booking, so the card is never blank. */
export function defaultDesign(input: { eventDate: string | null; venueName: string; locale: string }): InviteDesign {
  let eventDateText = "";
  if (input.eventDate) {
    const [y, m, d] = input.eventDate.slice(0, 10).split("-").map(Number);
    eventDateText = new Intl.DateTimeFormat(input.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, d)),
    );
  }
  return {
    templateKey: "klassisk",
    paletteKey: "skog",
    fontKey: "serif",
    headline: "",
    message: "",
    eventDateText,
    eventTimeText: "",
    placeText: input.venueName.slice(0, 120),
    dressCode: "",
    rsvpDeadline: null,
    status: "draft",
    publishedAt: null,
  };
}

/** WCAG relative luminance contrast ratio (used by the palette test). */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
