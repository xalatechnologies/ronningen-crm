import {
  DASHBOARD_TOTALS,
  FOCUS_BOOKING,
  HIGHLIGHT_MONTH,
  HIGHLIGHT_REVENUE,
  INVOICE_TOTALS,
  MONTHLY_BARS,
  PAYMENT_ALERTS,
  SAMPLE_INVOICES,
} from "@/components/landing/tour-3d/screens/sample-data";
import {
  STATUS_TONE,
  clamp01,
  drawStaffShell,
  drawTableHead,
  ease,
  finishStaffScreen,
  makeKit,
  toneColors,
} from "@/components/landing/tour-3d/screens/draw-kit";
import type { ScreenDrawer } from "@/components/landing/tour-3d/screens/screen-types";
import { withAlpha } from "@/components/landing/tour-3d/screen-palette";
import { interpolate } from "@/i18n/translate";

/** The deposit flips from sent to paid a little past the middle of the screen's moment. */
const PAID_AT = 0.55;

/** Invoices: the wedding deposit is paid and the totals move with it. */
export const drawInvoices: ScreenDrawer = (ctx, progress, env) => {
  const k = makeKit(ctx, env.theme.fonts);
  const p = env.theme.staff;
  const c = env.copy;
  drawStaffShell(ctx, k, env, "invoices");
  const paid = progress > PAID_AT;
  const flash = clamp01((progress - PAID_AT) / 0.25);
  const deposit = paid ? FOCUS_BOOKING.deposit : 0;

  const cw = (1240 - 40) / 3;
  const cards: [string, number, string][] = [
    [c.invoices.outstanding, INVOICE_TOTALS.outstanding - deposit, p.ink],
    [c.invoices.paidThisMonth, INVOICE_TOTALS.paidThisMonth + deposit, p.successText],
    [c.invoices.overdue, INVOICE_TOTALS.overdue, p.dangerText],
  ];
  cards.forEach(([label, value, color], i) => {
    const x = 320 + i * (cw + 20);
    const y = 164;
    k.box(x, y, cw, 124, 18, p.card, p.border);
    k.text(label, x + 24, y + 42, { size: 16, weight: 600, color: p.muted, maxWidth: cw - 48 });
    k.text(env.format.money(value), x + 24, y + 92, { size: 32, weight: 700, color });
    if (i === 1 && paid) {
      ctx.globalAlpha = flash;
      k.pill(`+${env.format.money(FOCUS_BOOKING.deposit)}`, x + cw - 24, y + 22, toneColors(p, "success"), 14, true);
      ctx.globalAlpha = 1;
    }
  });

  const tx = 320, ty = 310, tw = 1240;
  k.box(tx, ty, tw, 654, 18, p.card, p.border);
  drawTableHead(ctx, k, p, tx, ty, tw, [
    [c.invoices.invoice, 352],
    [c.invoices.customer, 540],
    [c.invoices.type, 880],
    [c.invoices.due, 1050],
    [c.invoices.amount, 1340, "right"],
    [c.invoices.status, 1528, "right"],
  ]);
  SAMPLE_INVOICES.forEach((row, i) => {
    const y = ty + 54 + i * 86;
    if (i === 0) {
      ctx.fillStyle = p.brandSoft;
      ctx.fillRect(tx + 2, y, tw - 4, 86);
    }
    k.text(row.number, 352, y + 50, { size: 16, weight: 600, color: p.muted });
    k.text(row.name, 540, y + 50, { size: 17, weight: 600, color: p.ink, maxWidth: 320 });
    k.text(row.kind === "deposit" ? c.invoices.deposit : c.invoices.final, 880, y + 50, { size: 16, color: p.muted, maxWidth: 160 });
    k.text(env.format.date(row.due, "short"), 1050, y + 50, { size: 16, color: p.ink });
    k.text(env.format.money(row.amount), 1340, y + 50, { size: 17, weight: 600, color: p.ink, align: "right" });
    const status = row.status ?? (paid ? "paid" : "sent");
    k.pill(c.status[status], 1528, y + 28, toneColors(p, STATUS_TONE[status]), 14, true);
    if (i < SAMPLE_INVOICES.length - 1) {
      ctx.fillStyle = p.border;
      ctx.fillRect(tx + 2, y + 86, tw - 4, 1.5);
    }
  });
  finishStaffScreen(ctx, k, env);
};

/** Dashboard: key figures count up, the monthly bars grow, payment alerts on the right. */
export const drawDashboard: ScreenDrawer = (ctx, progress, env) => {
  const k = makeKit(ctx, env.theme.fonts);
  const p = env.theme.staff;
  const c = env.copy.dashboard;
  drawStaffShell(ctx, k, env, "overview");

  const cw = (1240 - 60) / 4;
  const cards: { label: string; value: number; caption: string; kind: "brand" | "plain" | "danger" | "count" }[] = [
    { label: c.invoiced, value: DASHBOARD_TOTALS.invoiced, caption: c.allYears, kind: "brand" },
    { label: c.paid, value: DASHBOARD_TOTALS.paid, caption: c.paidShare, kind: "plain" },
    { label: c.unpaid, value: DASHBOARD_TOTALS.unpaid, caption: c.unpaidNote, kind: "danger" },
    { label: c.bookings, value: DASHBOARD_TOTALS.bookings, caption: c.venues, kind: "count" },
  ];
  cards.forEach((card, i) => {
    const x = 320 + i * (cw + 20);
    const y = 164;
    const brand = card.kind === "brand";
    k.box(x, y, cw, 148, 18, brand ? p.brand : p.card, brand ? undefined : p.border);
    const shown = card.value * ease(clamp01(progress * 1.4 - i * 0.1));
    const quiet = brand ? withAlpha(p.onBrand, 0.8) : p.muted;
    k.text(card.label, x + 24, y + 42, { size: 16, weight: 600, color: quiet, maxWidth: cw - 48 });
    k.text(card.kind === "count" ? String(Math.round(shown)) : env.format.money(shown), x + 24, y + 92, {
      size: 34,
      weight: 700,
      color: brand ? p.onBrand : card.kind === "danger" ? p.dangerText : p.ink,
    });
    k.text(card.caption, x + 24, y + 126, { size: 14, color: quiet, maxWidth: cw - 48 });
  });

  const cx = 320, cy = 336, cW = 820, cH = 628;
  k.box(cx, cy, cW, cH, 18, p.card, p.border);
  k.text(c.revenue, cx + 28, cy + 50, { size: 22, weight: 700, color: p.ink });
  k.text(c.revenueNote, cx + 28, cy + 80, { size: 16, color: p.muted });
  const top = cy + 130, bottom = cy + cH - 60, left = cx + 28, right = cx + cW - 28;
  ctx.fillStyle = p.border;
  for (let g = 0; g < 4; g += 1) ctx.fillRect(left, top + ((bottom - top) * g) / 3, right - left, 1.5);
  const gap = 14;
  const bw = (right - left - gap * 11) / 12;
  MONTHLY_BARS.forEach((height, i) => {
    const grow = ease(clamp01(progress * 1.7 - i * 0.06));
    const bh = (bottom - top) * (height / 100) * 0.9 * grow;
    const x = left + i * (bw + gap);
    const highlight = i === HIGHLIGHT_MONTH;
    if (bh > 1) k.box(x, bottom - bh, bw, bh, [10, 10, 0, 0], highlight ? p.brand : withAlpha(p.brand, 0.26));
    const month = env.format.date(new Date(Date.UTC(2026, i, 15)), "monthShort");
    k.text(month, x + bw / 2, bottom + 32, {
      size: 14,
      weight: highlight ? 700 : 500,
      color: highlight ? p.ink : p.muted,
      align: "center",
    });
  });
  if (progress > 0.8) {
    const x = left + HIGHLIGHT_MONTH * (bw + gap) + bw / 2;
    const barTop = bottom - (bottom - top) * 0.9;
    ctx.globalAlpha = clamp01((progress - 0.8) / 0.2);
    k.box(x - 70, barTop - 48, 140, 36, 18, p.ink);
    k.text(env.format.money(HIGHLIGHT_REVENUE), x, barTop - 24, { size: 15, weight: 700, color: p.card, align: "center" });
    ctx.globalAlpha = 1;
  }

  const ax = 1160, ay = 336;
  k.box(ax, ay, 400, 628, 18, p.card, p.border);
  k.circle(ax + 44, ay + 50, 18, p.dangerBg);
  k.text("!", ax + 44, ay + 57, { size: 20, weight: 800, color: p.dangerText, align: "center" });
  k.text(c.alerts, ax + 74, ay + 57, { size: 21, weight: 700, color: p.ink, maxWidth: 300 });
  PAYMENT_ALERTS.forEach((alert, i) => {
    const y = ay + 96 + i * 170;
    const tone = toneColors(p, STATUS_TONE[alert.status]);
    k.box(ax + 24, y, 352, 148, 14, p.segment);
    k.text(alert.name, ax + 44, y + 40, { size: 18, weight: 600, color: p.ink, maxWidth: 190 });
    k.text(env.format.money(alert.amount), ax + 356, y + 40, { size: 18, weight: 700, color: tone.fg, align: "right" });
    k.text(interpolate(c.event, { date: env.format.date(alert.eventDate, "dayMonth") }), ax + 44, y + 76, {
      size: 15,
      color: p.muted,
    });
    k.tracked(true);
    k.pill(env.copy.status[alert.status].toUpperCase(), ax + 44, y + 96, tone, 12);
    k.tracked(false);
  });
  finishStaffScreen(ctx, k, env);
};
