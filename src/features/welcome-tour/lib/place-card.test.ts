import { describe, expect, it } from "vitest";

import { CARD_GAP, VIEWPORT_MARGIN, placeCard, sameBox } from "@/features/welcome-tour/lib/place-card";

const card = { width: 320, height: 200 };
const VW = 1280;
const VH = 800;

describe("placeCard", () => {
  it("puts the card to the right of a side-bar item, level with it, with the arrow pointing at it", () => {
    const item = { left: 8, top: 300, width: 220, height: 44 };
    const p = placeCard(item, card, VW, VH, "right")!;
    expect(p.side).toBe("right");
    expect(p.left).toBe(item.left + item.width + CARD_GAP);
    expect(p.top).toBe(322 - 100); // item centre minus half the card
    expect(p.arrow).toEqual({ axis: "y", offset: 100 });
  });

  it("puts the card below a target in the main area, centred on it", () => {
    const button = { left: 600, top: 100, width: 120, height: 40 };
    const p = placeCard(button, card, VW, VH)!;
    expect(p.side).toBe("below");
    expect(p.top).toBe(140 + CARD_GAP);
    expect(p.left).toBe(660 - 160);
    expect(p.arrow).toEqual({ axis: "x", offset: 160 });
  });

  it("puts the card above when there is no room below", () => {
    const button = { left: 600, top: 700, width: 120, height: 40 };
    const p = placeCard(button, card, VW, VH)!;
    expect(p.side).toBe("above");
    expect(p.top).toBe(700 - CARD_GAP - card.height);
  });

  it("keeps the card inside the viewport at the edges and moves the arrow to still point at the target", () => {
    const nearRight = { left: 1240, top: 100, width: 30, height: 30 };
    const p = placeCard(nearRight, card, VW, VH)!;
    expect(p.left).toBe(VW - card.width - VIEWPORT_MARGIN);
    expect(p.arrow.offset).toBeGreaterThan(card.width / 2);
    expect(p.arrow.offset).toBeLessThanOrEqual(card.width - 20);

    const nearLeft = { left: 0, top: 100, width: 30, height: 30 };
    expect(placeCard(nearLeft, card, VW, VH)!.left).toBe(VIEWPORT_MARGIN);
  });

  it("keeps a side-bar card inside the viewport vertically", () => {
    const top = placeCard({ left: 8, top: 0, width: 220, height: 44 }, card, VW, VH, "right")!;
    expect(top.top).toBe(VIEWPORT_MARGIN);
    const bottom = placeCard({ left: 8, top: 770, width: 220, height: 44 }, card, VW, VH, "right")!;
    expect(bottom.top).toBe(VH - card.height - VIEWPORT_MARGIN);
    expect(bottom.arrow.offset).toBeLessThanOrEqual(card.height - 20);
  });

  it("falls back to below/above when 'right' does not fit", () => {
    const wide = { left: 500, top: 100, width: 700, height: 40 };
    expect(placeCard(wide, card, VW, VH, "right")!.side).toBe("below");
  });

  it("returns null on a small screen so the card sits in the corner", () => {
    expect(placeCard({ left: 10, top: 10, width: 100, height: 40 }, { width: 288, height: 200 }, 375, 700)).toBeNull();
    expect(placeCard({ left: 10, top: 10, width: 100, height: 40 }, card, 639, 700, "right")).toBeNull();
  });

  it("returns null when there is no room on any side", () => {
    const tall = { left: 20, top: 10, width: 1240, height: 780 };
    expect(placeCard(tall, card, VW, VH)).toBeNull();
  });
});

describe("sameBox", () => {
  it("ignores sub-pixel differences and tells a real move", () => {
    const a = { left: 10.2, top: 20.4, width: 100.1, height: 30.3 };
    expect(sameBox(a, { left: 10.4, top: 20.2, width: 99.9, height: 30.4 })).toBe(true);
    expect(sameBox(a, { ...a, top: 25 })).toBe(false);
    expect(sameBox(null, null)).toBe(true);
    expect(sameBox(a, null)).toBe(false);
  });
});
