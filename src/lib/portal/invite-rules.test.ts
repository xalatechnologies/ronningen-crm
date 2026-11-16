import { describe, expect, it } from "vitest";

import { containsLink, contrastRatio, defaultDesign, FLOWER_STYLES, FLOWER_TONES, FLOWER_TYPES, inviteDesignSchema, missingForPublish, PALETTES, PALETTE_KEYS, type InviteDesign } from "./invite-rules";

const base = { templateKey: "klassisk", paletteKey: "skog", fontKey: "serif", headline: "Kari & Ola gifter seg", message: "", eventDateText: "lørdag 12. juni", eventTimeText: "", placeText: "", dressCode: "" } as const;

describe("containsLink", () => {
  it("catches urls, www and bare domains", () => {
    for (const t of ["https://x.no", "http://evil.com/login", "www.gave.no", "se gave.no", "bit.ly/abc", "klikk eksempel.com nå", "bank-secure.shop", "claim at pay.support", "refund.online", "vipps.xyz"]) {
      expect(containsLink(t), t).toBe(true);
    }
  });
  it("leaves normal text alone", () => {
    for (const t of ["Vi gifter oss!", "Kl. 14.00 i hagen", "Antrekk: pent, gjerne lyst", "Ola & Kari"]) {
      expect(containsLink(t), t).toBe(false);
    }
  });
});

describe("inviteDesignSchema", () => {
  it("accepts a normal design and trims", () => {
    const r = inviteDesignSchema.parse({ ...base, headline: "  Kari & Ola  " });
    expect(r.headline).toBe("Kari & Ola");
    expect(r.rsvpDeadline).toBeNull();
  });
  it("rejects unknown keys, long text and links in any field", () => {
    expect(inviteDesignSchema.safeParse({ ...base, templateKey: "popup" }).success).toBe(false);
    expect(inviteDesignSchema.safeParse({ ...base, paletteKey: "lilla" }).success).toBe(false);
    expect(inviteDesignSchema.safeParse({ ...base, headline: "x".repeat(81) }).success).toBe(false);
    expect(inviteDesignSchema.safeParse({ ...base, message: "x".repeat(601) }).success).toBe(false);
    expect(inviteDesignSchema.safeParse({ ...base, message: "Se https://gave.no" }).success).toBe(false);
    expect(inviteDesignSchema.safeParse({ ...base, placeText: "www.hotell.no" }).success).toBe(false);
    expect(inviteDesignSchema.safeParse({ ...base, rsvpDeadline: "12.06.2027" }).success).toBe(false);
  });
});

describe("missingForPublish", () => {
  it("needs a headline and a date", () => {
    expect(missingForPublish({ headline: "", eventDateText: "" })).toEqual(["headline", "eventDateText"]);
    expect(missingForPublish({ headline: " ", eventDateText: "12. juni" })).toEqual(["headline"]);
    expect(missingForPublish({ headline: "Hei", eventDateText: "12. juni" })).toEqual([]);
  });
});

describe("defaultDesign", () => {
  it("prefills date and place from the booking", () => {
    const d: InviteDesign = defaultDesign({ eventDate: "2027-06-12", venueName: "Rønningen", locale: "nb" });
    expect(d.eventDateText.toLowerCase()).toContain("12. juni 2027");
    expect(d.placeText).toBe("Rønningen");
    expect(d.status).toBe("draft");
  });
  it("handles a missing date", () => {
    expect(defaultDesign({ eventDate: null, venueName: "X", locale: "nb" }).eventDateText).toBe("");
  });
});

describe("palettes", () => {
  it("every palette has readable body text (AA 4.5:1) and readable muted text", () => {
    for (const key of PALETTE_KEYS) {
      const p = PALETTES[key];
      expect(contrastRatio(p.ink, p.bg), `${key} ink`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.muted, p.bg), `${key} muted`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.accent, p.bg), `${key} accent`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("flowers on the card", () => {
  const card = { templateKey: "klassisk", paletteKey: "skog", fontKey: "serif", headline: "Anna og Per", message: "", eventDateText: "12. juni", eventTimeText: "", placeText: "", dressCode: "" } as const;

  it("old cards without flower fields stay unchanged (defaults)", () => {
    const r = inviteDesignSchema.parse(card);
    expect(r).toMatchObject({ flowerStyle: "none", flowerType: "blomst", flowerTone: "accent" });
  });

  it("accepts every style, type and tone", () => {
    for (const flowerStyle of FLOWER_STYLES) for (const flowerType of FLOWER_TYPES) for (const flowerTone of FLOWER_TONES) {
      expect(inviteDesignSchema.safeParse({ ...card, flowerStyle, flowerType, flowerTone }).success).toBe(true);
    }
  });

  it("rejects unknown keys (flowers are fixed choices, never free text)", () => {
    expect(inviteDesignSchema.safeParse({ ...card, flowerStyle: "https://evil.example" }).success).toBe(false);
    expect(inviteDesignSchema.safeParse({ ...card, flowerType: "orkide" }).success).toBe(false);
    expect(inviteDesignSchema.safeParse({ ...card, flowerTone: "#ff0000" }).success).toBe(false);
  });

  it("a new default design has no flowers", () => {
    expect(defaultDesign({ eventDate: null, venueName: "Lokalet", locale: "nb" })).toMatchObject({ flowerStyle: "none" });
  });
});
