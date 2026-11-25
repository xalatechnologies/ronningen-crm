export type Box = { left: number; top: number; width: number; height: number };
export type CardSize = { width: number; height: number };

export type CardPlacement = {
  /** Position of the card's top-left corner in viewport pixels. */
  left: number;
  top: number;
  side: "right" | "below" | "above";
  /** Where the arrow sits along the card edge that faces the target, in pixels from that edge's start. */
  arrow: { axis: "x" | "y"; offset: number };
};

/** Space between the target and the card, and the smallest distance kept to the viewport edge. */
export const CARD_GAP = 14;
export const VIEWPORT_MARGIN = 8;
/** Keeps the arrow off the card's rounded corners. */
const ARROW_INSET = 20;
/** Below this width the card is not placed next to the target; it sits in the corner instead. */
export const MIN_ANCHORED_WIDTH = 640;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Decides where the tour card goes next to the highlighted box.
 * `prefer: "right"` is for side-bar items (card to the right); otherwise the card goes below the target,
 * or above when there is no room below. The card is kept inside the viewport.
 * Returns null when it cannot be placed next to the target (small screen, or no room on any side);
 * the caller then shows the card fixed in a corner.
 */
export function placeCard(
  target: Box,
  card: CardSize,
  viewportWidth: number,
  viewportHeight: number,
  prefer: "right" | "auto" = "auto",
): CardPlacement | null {
  if (viewportWidth < MIN_ANCHORED_WIDTH) return null;

  const maxLeft = viewportWidth - card.width - VIEWPORT_MARGIN;
  const maxTop = viewportHeight - card.height - VIEWPORT_MARGIN;
  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;

  const fitsRight = target.left + target.width + CARD_GAP + card.width <= viewportWidth - VIEWPORT_MARGIN;
  if (prefer === "right" && fitsRight) {
    const top = clamp(centerY - card.height / 2, VIEWPORT_MARGIN, maxTop);
    return {
      left: target.left + target.width + CARD_GAP,
      top,
      side: "right",
      arrow: { axis: "y", offset: clamp(centerY - top, ARROW_INSET, card.height - ARROW_INSET) },
    };
  }

  const fitsBelow = target.top + target.height + CARD_GAP + card.height <= viewportHeight - VIEWPORT_MARGIN;
  const fitsAbove = target.top - CARD_GAP - card.height >= VIEWPORT_MARGIN;
  if (fitsBelow || fitsAbove) {
    const left = clamp(centerX - card.width / 2, VIEWPORT_MARGIN, maxLeft);
    return {
      left,
      top: fitsBelow ? target.top + target.height + CARD_GAP : target.top - CARD_GAP - card.height,
      side: fitsBelow ? "below" : "above",
      arrow: { axis: "x", offset: clamp(centerX - left, ARROW_INSET, card.width - ARROW_INSET) },
    };
  }

  // A target in the side-bar on a wide screen with no room below or above can still use the right side.
  if (fitsRight) {
    const top = clamp(centerY - card.height / 2, VIEWPORT_MARGIN, maxTop);
    return {
      left: target.left + target.width + CARD_GAP,
      top,
      side: "right",
      arrow: { axis: "y", offset: clamp(centerY - top, ARROW_INSET, card.height - ARROW_INSET) },
    };
  }
  return null;
}

/** True when two measured boxes are the same to the pixel, so state is only updated when something moved. */
export function sameBox(a: Box | null, b: Box | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return Math.round(a.left) === Math.round(b.left) && Math.round(a.top) === Math.round(b.top) && Math.round(a.width) === Math.round(b.width) && Math.round(a.height) === Math.round(b.height);
}
