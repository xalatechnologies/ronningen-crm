import { type ScreenFonts, type StaffPalette, withAlpha } from "@/components/landing/tour-3d/screen-palette";
import type { DrawEnv, StatusKey, Tone } from "@/components/landing/tour-3d/screens/screen-types";
import { APP_NAME } from "@/config/app";

/** Canvas size of the desktop screens; the phone screen has its own size. */
export const DESKTOP_W = 1600;
export const DESKTOP_H = 1000;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const STATUS_TONE: Record<StatusKey, Tone> = {
  new: "info",
  offerSent: "warning",
  confirmed: "success",
  reserved: "warning",
  sent: "info",
  paid: "success",
  overdue: "danger",
  dueSoon: "warning",
  reminded: "info",
};

export type ToneColors = { bg: string; fg: string };

export function toneColors(p: StaffPalette, tone: Tone): ToneColors {
  return { bg: p[`${tone}Bg`], fg: p[`${tone}Text`] };
}

export type TextStyle = {
  size: number;
  weight?: number;
  color: string;
  align?: CanvasTextAlign;
  serif?: boolean;
  maxWidth?: number;
};

/** Small drawing helpers bound to one canvas and the page fonts. */
export function makeKit(ctx: CanvasRenderingContext2D, fonts: ScreenFonts) {
  const font = (weight: number, size: number, serif = false) =>
    `${weight} ${size}px ${serif ? fonts.serif : fonts.sans}`;

  const fit = (s: string, maxWidth?: number) => {
    if (!maxWidth || ctx.measureText(s).width <= maxWidth) return s;
    let out = s;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
    return `${out}…`;
  };

  const text = (s: string, x: number, y: number, style: TextStyle) => {
    ctx.font = font(style.weight ?? 500, style.size, style.serif);
    ctx.fillStyle = style.color;
    ctx.textAlign = style.align ?? "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(fit(s, style.maxWidth), x, y);
  };

  const box = (x: number, y: number, w: number, h: number, r: number | number[], fill?: string, stroke?: string, lw = 2) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  };

  const circle = (cx: number, cy: number, r: number, fill: string) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };

  /** Uppercase labels get a little letter spacing where the browser supports it. */
  const tracked = (on: boolean) => {
    if ("letterSpacing" in ctx) ctx.letterSpacing = on ? "1.5px" : "0px";
  };

  /** A status pill; returns its width. */
  const pill = (label: string, x: number, y: number, colors: ToneColors, size = 14, alignRight = false) => {
    ctx.font = font(700, size);
    const w = ctx.measureText(label).width + size * 1.7;
    const h = size * 2.1;
    const left = alignRight ? x - w : x;
    box(left, y, w, h, h / 2, colors.bg);
    ctx.fillStyle = colors.fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, left + w / 2, y + h / 2 + 1);
    ctx.textBaseline = "alphabetic";
    return w;
  };

  return { font, fit, text, box, circle, tracked, pill };
}

export type Kit = ReturnType<typeof makeKit>;

function initials(name: string): string {
  return name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type NavKey = keyof DrawEnv["copy"]["nav"];
const NAV_ORDER: NavKey[] = ["overview", "calendar", "inquiries", "bookings", "customers", "invoices", "finance", "reports"];

/**
 * The staff app frame: navy sidebar, top bar with search, page title. Leaves a clip active;
 * every screen ends with `finishStaffScreen`.
 */
export function drawStaffShell(ctx: CanvasRenderingContext2D, k: Kit, env: DrawEnv, active: NavKey) {
  const p = env.theme.staff;
  ctx.clearRect(0, 0, DESKTOP_W, DESKTOP_H);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, DESKTOP_W, DESKTOP_H, 22);
  ctx.clip();
  ctx.fillStyle = p.canvas;
  ctx.fillRect(0, 0, DESKTOP_W, DESKTOP_H);
  ctx.fillStyle = p.sidebar;
  ctx.fillRect(0, 0, 280, DESKTOP_H);

  k.box(28, 30, 46, 46, 12, p.brand);
  k.text(APP_NAME.charAt(0), 51, 62, { size: 26, weight: 800, color: p.onBrand, align: "center" });
  k.text(env.copy.org, 88, 50, { size: 18, weight: 700, color: p.sidebarText, maxWidth: 180 });
  k.text(APP_NAME, 88, 72, { size: 14, color: withAlpha(p.sidebarText, 0.65) });

  NAV_ORDER.forEach((key, i) => {
    const y = 128 + i * 54;
    const on = key === active;
    if (on) k.box(16, y, 248, 46, 10, p.sidebarActive);
    k.box(36, y + 14, 18, 18, 5, on ? p.sidebarRing : withAlpha(p.sidebarText, 0.3));
    k.text(env.copy.nav[key], 68, y + 30, {
      size: 17,
      weight: on ? 600 : 500,
      color: on ? p.sidebarText : withAlpha(p.sidebarText, 0.75),
    });
  });

  k.box(320, 18, 380, 40, 20, p.card, p.border);
  k.text(env.copy.search, 346, 44, { size: 16, color: p.muted });
  k.circle(1546, 38, 21, p.brandSoft);
  k.text(initials(env.copy.org), 1546, 44, { size: 15, weight: 700, color: p.brand, align: "center" });
  k.text(env.copy.nav[active], 320, 138, { size: 34, weight: 700, color: p.ink });
}

export function finishStaffScreen(ctx: CanvasRenderingContext2D, k: Kit, env: DrawEnv) {
  ctx.restore();
  k.box(1, 1, DESKTOP_W - 2, DESKTOP_H - 2, 22, undefined, env.theme.staff.frame, 2);
}

/** A table's header bar with uppercase column labels: [label, x, align]. */
export function drawTableHead(
  ctx: CanvasRenderingContext2D,
  k: Kit,
  p: StaffPalette,
  x: number,
  y: number,
  w: number,
  cols: [string, number, CanvasTextAlign?][],
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, 52, [18, 18, 0, 0]);
  ctx.clip();
  ctx.fillStyle = p.tableHead;
  ctx.fillRect(x, y, w, 52);
  ctx.restore();
  ctx.fillStyle = p.border;
  ctx.fillRect(x, y + 52, w, 1.5);
  k.tracked(true);
  cols.forEach(([label, cx, align]) =>
    k.text(label.toUpperCase(), cx, y + 33, { size: 13, weight: 700, color: p.muted, align: align ?? "left" }),
  );
  k.tracked(false);
}

const AVATAR_TONES: Tone[] = ["info", "success", "warning", "info"];

export function drawAvatar(k: Kit, p: StaffPalette, name: string, cx: number, cy: number, i: number) {
  const tone = toneColors(p, AVATAR_TONES[i % AVATAR_TONES.length]!);
  k.circle(cx, cy, 22, tone.bg);
  k.text(initials(name), cx, cy + 5, { size: 14, weight: 700, color: tone.fg, align: "center" });
}

export type GlyphType = "chat" | "check" | "clock" | "list" | "home" | "users";

/** Simple line icons for the phone screen, drawn around (cx, cy). */
export function drawGlyph(ctx: CanvasRenderingContext2D, type: GlyphType, cx: number, cy: number, color: string, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (type === "chat") {
    ctx.roundRect(-16, -13, 32, 22, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, 9);
    ctx.lineTo(-10, 17);
    ctx.lineTo(2, 9);
    ctx.stroke();
  } else if (type === "check") {
    ctx.moveTo(-12, 0);
    ctx.lineTo(-3, 9);
    ctx.lineTo(13, -9);
    ctx.stroke();
  } else if (type === "clock") {
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 0);
    ctx.lineTo(7, 5);
    ctx.stroke();
  } else if (type === "list") {
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-6, i * 9);
      ctx.lineTo(14, i * 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-14, i * 9, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === "home") {
    ctx.moveTo(-14, 0);
    ctx.lineTo(0, -13);
    ctx.lineTo(14, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -3);
    ctx.lineTo(-10, 13);
    ctx.lineTo(10, 13);
    ctx.lineTo(10, -3);
    ctx.stroke();
  } else {
    ctx.arc(-3, -6, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-3, 16, 13, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(11, -4, 5, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}
