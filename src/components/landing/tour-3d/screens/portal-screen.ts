import { FOCUS_BOOKING } from "@/components/landing/tour-3d/screens/sample-data";
import { type GlyphType, clamp01, drawGlyph, ease, makeKit } from "@/components/landing/tour-3d/screens/draw-kit";
import type { ScreenDrawer } from "@/components/landing/tour-3d/screens/screen-types";
import { APP_NAME } from "@/config/app";
import { interpolate } from "@/i18n/translate";

const PHONE_W = 780;
const PHONE_H = 1600;

type Card = { glyph: GlyphType; title: string; body: string; kind: "attention" | "done" | "plain" };

/** Customer portal home on a phone, in the wedding theme. The next-step cards rise in one by one. */
export const drawPortal: ScreenDrawer = (ctx, progress, env) => {
  const k = makeKit(ctx, env.theme.fonts);
  const p = env.theme.portal;
  const c = env.copy.portal;
  ctx.clearRect(0, 0, PHONE_W, PHONE_H);
  k.box(0, 0, PHONE_W, PHONE_H, 96, p.ink);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(18, 18, PHONE_W - 36, PHONE_H - 36, 80);
  ctx.clip();
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, PHONE_W, PHONE_H);
  ctx.globalAlpha = 0.6;
  k.circle(700, 420, 240, p.soft);
  ctx.globalAlpha = 1;
  k.box(300, 38, 180, 46, 23, p.ink);

  k.box(60, 128, 72, 72, 18, p.primary);
  k.text(APP_NAME.charAt(0), 96, 176, { size: 34, weight: 700, color: p.card, align: "center" });
  k.text(env.copy.org, 152, 162, { size: 28, weight: 600, color: p.heading, serif: true, maxWidth: 560 });
  k.tracked(true);
  k.text(APP_NAME.toUpperCase(), 152, 192, { size: 15, weight: 700, color: p.muted });
  k.tracked(false);
  ctx.fillStyle = p.gold;
  ctx.fillRect(60, 232, 660, 2);

  k.text(c.greeting, 60, 326, { size: 50, weight: 600, color: p.heading, serif: true, maxWidth: 660 });
  const details = interpolate(c.details, {
    event: env.copy.events[FOCUS_BOOKING.event],
    date: env.format.date(FOCUS_BOOKING.date, "long"),
    count: FOCUS_BOOKING.guests,
  });
  k.text(details, 60, 374, { size: 22, color: p.muted, maxWidth: 660 });

  k.box(60, 412, 660, 176, 32, p.primary);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    k.circle(620 + Math.cos(a) * 34, 500 + Math.sin(a) * 34, 30, p.card);
  }
  ctx.globalAlpha = 1;
  k.text(String(FOCUS_BOOKING.daysLeft), 100, 512, { size: 72, weight: 600, color: p.card, serif: true });
  ctx.globalAlpha = 0.88;
  k.text(c.daysLeft, 100, 556, { size: 22, color: p.card, maxWidth: 440 });
  ctx.globalAlpha = 1;

  k.text(c.nextSteps, 60, 664, { size: 30, weight: 600, color: p.heading, serif: true });
  const cards: Card[] = [
    { glyph: "chat", title: c.messages, body: c.messagesNote, kind: "attention" },
    { glyph: "check", title: c.guestList, body: interpolate(c.guestCount, { count: FOCUS_BOOKING.guests }), kind: "done" },
    { glyph: "clock", title: c.dayPlan, body: c.dayPlanNote, kind: "plain" },
    { glyph: "list", title: c.request, body: c.requestNote, kind: "plain" },
  ];
  cards.forEach((card, i) => {
    const rise = ease(clamp01(progress * 1.6 - i * 0.14));
    const y = 694 + i * 172 + (1 - rise) * 60;
    ctx.globalAlpha = rise;
    k.box(60, y, 660, 150, 28, card.kind === "attention" ? p.soft : p.card, p.border);
    const iconBg = card.kind === "attention" ? p.primary : card.kind === "done" ? p.successBg : p.soft;
    const iconFg = card.kind === "attention" ? p.card : card.kind === "done" ? p.successText : p.primary;
    k.circle(130, y + 75, 36, iconBg);
    drawGlyph(ctx, card.glyph, 130, y + 75, iconFg);
    k.text(card.title, 188, y + 66, { size: 25, weight: 600, color: p.heading, maxWidth: 470 });
    k.text(card.body, 188, y + 104, { size: 20, color: p.muted, maxWidth: 470 });
    k.text("›", 694, y + 90, { size: 40, weight: 400, color: p.muted, align: "right" });
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = p.card;
  ctx.fillRect(0, 1436, PHONE_W, 170);
  ctx.fillStyle = p.border;
  ctx.fillRect(0, 1436, PHONE_W, 2);
  const tabs: [GlyphType, string][] = [
    ["home", c.tabOverview],
    ["users", c.tabGuests],
    ["list", c.tabWishes],
    ["clock", c.tabDayPlan],
    ["chat", c.tabMessages],
  ];
  tabs.forEach(([glyph, label], i) => {
    const x = 18 + (744 * (i + 0.5)) / 5;
    const on = i === 0;
    if (on) k.box(x - 40, 1458, 80, 48, 24, p.soft);
    drawGlyph(ctx, glyph, x, 1482, on ? p.primary : p.muted, 0.8);
    k.text(label, x, 1536, { size: 16, weight: on ? 700 : 500, color: on ? p.primary : p.muted, align: "center", maxWidth: 140 });
  });
  k.box(290, 1560, 200, 8, 4, p.ink);
  ctx.restore();
};
