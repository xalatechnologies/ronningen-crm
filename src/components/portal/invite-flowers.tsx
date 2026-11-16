import type { CSSProperties, ReactNode } from "react";

import { PALETTES, type FlowerStyle, type FlowerTone, type FlowerType, type PaletteKey } from "@/lib/portal/invite-rules";

/** Petal colours for the chosen tone. "accent" follows the card's own accent colour. */
const TONE_FILL: Record<Exclude<FlowerTone, "accent">, string> = { rosa: "#e59aa8", gull: "#d9b45a", hvit: "#f8f2ea" };

function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export type FlowerColors = { petal: string; leaf: string; center: string; line: string };

export function flowerColors(palette: PaletteKey, tone: FlowerTone): FlowerColors {
  const p = PALETTES[palette];
  const petal = tone === "accent" ? p.accent : TONE_FILL[tone];
  return {
    petal,
    leaf: isDark(p.bg) ? "#93b186" : "#5b7d52",
    center: tone === "gull" ? "#a9791f" : "#e8c35e",
    line: "rgba(0,0,0,0.16)",
  };
}

const rot = (deg: number) => `rotate(${deg} 50 50)`;

/** One flower or sprig in a 100x100 box. Decoration only: aria-hidden, no text. */
export function Bloom({ type, colors, size, rotate = 0, style }: { type: FlowerType; colors: FlowerColors; size: string; rotate?: number; style?: CSSProperties }) {
  const common: CSSProperties = { width: size, height: size, flex: "none", display: "block", transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style };
  const stroke = { stroke: colors.line, strokeWidth: 1, strokeLinejoin: "round" as const };

  let art: ReactNode;
  if (type === "tusenfryd") {
    art = (
      <>
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} transform={rot((360 / 14) * i)} d="M50 50C46 38 46 18 50 5C54 18 54 38 50 50Z" fill={colors.petal} {...stroke} />
        ))}
        <circle cx="50" cy="50" r="9" fill={colors.center} {...stroke} />
      </>
    );
  } else if (type === "ros") {
    art = (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse key={i} transform={rot(60 * i)} cx="50" cy="26" rx="16" ry="21" fill={colors.petal} {...stroke} />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <ellipse key={i} transform={rot(36 + 72 * i)} cx="50" cy="35" rx="11" ry="14" fill={colors.petal} {...stroke} />
        ))}
        <circle cx="50" cy="50" r="12" fill={colors.petal} {...stroke} />
        <path d="M44 50a6 6 0 1 1 6 6a10 10 0 1 1-10-10" fill="none" stroke={colors.line} strokeWidth="1.6" strokeLinecap="round" />
      </>
    );
  } else if (type === "kvist") {
    art = (
      <>
        <path d="M50 96C48 70 52 40 64 8" fill="none" stroke={colors.leaf} strokeWidth="2.4" strokeLinecap="round" />
        {[
          [49, 84, -50],
          [51, 70, 50],
          [52, 56, -48],
          [55, 43, 48],
          [58, 30, -45],
          [62, 18, 45],
        ].map(([x, y, a], i) => (
          <path key={i} transform={`translate(${x} ${y}) rotate(${a})`} d="M0 0C4-10 14-14 24-12C22-2 12 4 0 0Z" fill={colors.leaf} {...stroke} />
        ))}
      </>
    );
  } else {
    art = (
      <>
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} transform={rot(72 * i)} d="M50 48C36 36 36 12 50 5C64 12 64 36 50 48Z" fill={colors.petal} {...stroke} />
        ))}
        <circle cx="50" cy="50" r="7" fill={colors.center} {...stroke} />
      </>
    );
  }

  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false" style={common}>
      {art}
    </svg>
  );
}

const abs = (css: CSSProperties): CSSProperties => ({ position: "absolute", ...css });

export type FlowerDecor = { top: ReactNode; bottom: ReactNode; overlay: ReactNode };

/**
 * The flowers of a card as three pieces: in-flow strips above and below the text (they reserve their own
 * room, so text is never covered) and an absolutely positioned overlay in the corners/margins. All sizes
 * are container units, so they scale with the card exactly like the text does.
 */
export function flowerDecor(style: FlowerStyle, type: FlowerType, tone: FlowerTone, palette: PaletteKey): FlowerDecor {
  const none: FlowerDecor = { top: null, bottom: null, overlay: null };
  if (style === "none") return none;
  const c = flowerColors(palette, tone);
  const flower = (size: string, rotate = 0, key?: string | number, extra?: CSSProperties) => <Bloom key={key} type={type} colors={c} size={size} rotate={rotate} style={extra} />;
  const sprig = (size: string, rotate = 0, key?: string | number, extra?: CSSProperties) => <Bloom key={key} type="kvist" colors={c} size={size} rotate={rotate} style={extra} />;
  const strip = (children: ReactNode, height: string): ReactNode => (
    <div aria-hidden style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height, minWidth: 0 }}>
      {children}
    </div>
  );

  if (style === "krans") {
    return {
      ...none,
      top: strip(
        <>
          {sprig("15cqw", -62, "a", { marginRight: "-3cqw" })}
          {flower("12cqw", -15, "b", { marginRight: "-2cqw" })}
          {flower("17cqw", 0, "c", { marginRight: "-2cqw" })}
          {flower("12cqw", 15, "d", { marginRight: "-3cqw" })}
          {sprig("15cqw", 62, "e")}
        </>,
        "17cqw",
      ),
    };
  }

  if (style === "bukett") {
    return {
      ...none,
      bottom: strip(
        <>
          {sprig("22cqw", -35, "a", { marginRight: "-6cqw" })}
          {flower("13cqw", -20, "b", { marginRight: "-3cqw" })}
          {flower("19cqw", 0, "c", { marginRight: "-3cqw" })}
          {flower("13cqw", 20, "d", { marginRight: "-6cqw" })}
          {sprig("22cqw", 35, "e")}
        </>,
        "24cqw",
      ),
    };
  }

  if (style === "bord") {
    const row = (
      <div aria-hidden style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", height: "9cqw" }}>
        <span style={abs({ left: 0, right: 0, top: "50%", height: "1px", background: c.petal, opacity: 0.55 })} />
        {Array.from({ length: 7 }, (_, i) => (i % 2 === 0 ? flower("8cqw", i * 25, i, { position: "relative" }) : sprig("7cqw", i % 4 === 1 ? -80 : 80, i, { position: "relative" })))}
      </div>
    );
    return { ...none, top: row, bottom: row };
  }

  if (style === "hjorner") {
    const corner = (extra: CSSProperties): ReactNode => (
      <div aria-hidden style={abs({ width: "34cqw", height: "34cqw", pointerEvents: "none", ...extra })}>
        {sprig("25cqw", 100, "s", abs({ left: "-6cqw", top: "5cqw" }))}
        {sprig("21cqw", 10, "t", abs({ left: "6cqw", top: "-5cqw" }))}
        {flower("15cqw", 12, "f1", abs({ left: "-4cqw", top: "-4cqw" }))}
        {flower("9cqw", -20, "f2", abs({ left: "12cqw", top: "5cqw" }))}
        {flower("8cqw", 30, "f3", abs({ left: "3cqw", top: "14cqw" }))}
      </div>
    );
    // Empty strips above and below keep the first and last lines of text clear of the corner flowers.
    const gap = <div aria-hidden style={{ height: "7cqw" }} />;
    return { top: gap, bottom: gap, overlay: <>{corner({ left: 0, top: 0 })}{corner({ right: 0, bottom: 0, transform: "rotate(180deg)" })}</> };
  }

  // spredt: a few small flowers along the edges
  const spots: [string, string, string, number][] = [
    ["3%", "2%", "11cqw", 10],
    ["84%", "3%", "9cqw", -25],
    ["90%", "40%", "7cqw", 40],
    ["2%", "54%", "8cqw", -10],
    ["6%", "92%", "10cqw", 25],
    ["80%", "93%", "12cqw", -35],
  ];
  return {
    ...none,
    overlay: (
      <div aria-hidden style={abs({ inset: 0, pointerEvents: "none" })}>
        {spots.map(([x, y, size, r], i) => flower(size, r, i, abs({ left: x, top: y, opacity: 0.92 })))}
      </div>
    ),
  };
}
