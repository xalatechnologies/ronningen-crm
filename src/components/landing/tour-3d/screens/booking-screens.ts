import {
  CALENDAR_ENTRIES,
  CALENDAR_MONTH,
  FOCUS_BOOKING,
  INQUIRY_COUNTS,
  SAMPLE_INQUIRIES,
} from "@/components/landing/tour-3d/screens/sample-data";
import {
  STATUS_TONE,
  clamp01,
  drawAvatar,
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

/** Inquiries list: the wedding inquiry slides in at the top and a toast announces it. */
export const drawInquiries: ScreenDrawer = (ctx, progress, env) => {
  const k = makeKit(ctx, env.theme.fonts);
  const p = env.theme.staff;
  const c = env.copy;
  drawStaffShell(ctx, k, env, "inquiries");
  const arrive = ease(clamp01(progress * 1.8));

  k.box(320, 164, 640, 50, 12, p.segment);
  let x = 326;
  const segments: [string, number][] = [
    [c.inquiries.all, INQUIRY_COUNTS.all],
    [c.inquiries.newOnes, INQUIRY_COUNTS.newOnes],
    [c.status.offerSent, INQUIRY_COUNTS.offerSent],
    [c.status.confirmed, INQUIRY_COUNTS.confirmed],
  ];
  segments.forEach(([label, count], i) => {
    ctx.font = k.font(600, 16);
    const labelWidth = ctx.measureText(label).width;
    ctx.font = k.font(700, 15);
    const w = labelWidth + ctx.measureText(String(count)).width + 46;
    if (i === 0) k.box(x, 170, w, 38, 9, p.card);
    k.text(label, x + 16, 195, { size: 16, weight: 600, color: i === 0 ? p.ink : p.muted });
    k.text(String(count), x + w - 16, 195, { size: 15, weight: 700, color: p.muted, align: "right" });
    x += w + 4;
  });
  k.box(1352, 164, 208, 50, 12, p.brand);
  k.text(c.inquiries.newButton, 1456, 196, { size: 16, weight: 700, color: p.onBrand, align: "center", maxWidth: 190 });

  const tx = 320, ty = 232, tw = 1240, th = 732;
  k.box(tx, ty, tw, th, 18, p.card, p.border);
  drawTableHead(ctx, k, p, tx, ty, tw, [
    [c.inquiries.customer, 352],
    [c.inquiries.date, 800],
    [c.inquiries.guests, 1010],
    [c.inquiries.finance, 1290, "right"],
    [c.inquiries.status, 1528, "right"],
  ]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(tx, ty + 54, tw, th - 56);
  ctx.clip();
  SAMPLE_INQUIRIES.forEach((row, i) => {
    // Before the new inquiry arrives, the other rows sit one slot higher and slide down as it appears.
    const slot = i === 0 ? 0 : i - (1 - arrive);
    const y = ty + 54 + slot * 84;
    ctx.globalAlpha = i === 0 ? arrive : 1;
    if (i === 0) {
      ctx.fillStyle = p.brandSoft;
      ctx.fillRect(tx + 2, y, tw - 4, 84);
    }
    drawAvatar(k, p, row.name, 374, y + 42, i);
    k.text(row.name, 410, y + 38, { size: 18, weight: 600, color: p.ink, maxWidth: 360 });
    k.text(c.events[row.event], 410, y + 62, { size: 15, color: p.muted });
    k.text(env.format.date(row.date, "short"), 800, y + 48, { size: 17, color: p.ink });
    k.text(String(row.guests), 1010, y + 48, { size: 17, color: p.ink });
    k.text(env.format.money(row.amount), 1290, y + 48, { size: 17, weight: 600, color: p.ink, align: "right" });
    k.pill(c.status[row.status], 1528, y + 27, toneColors(p, STATUS_TONE[row.status]), 14, true);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.border;
    ctx.fillRect(tx + 2, y + 84, tw - 4, 1.5);
  });
  ctx.restore();

  const toast = clamp01((progress - 0.15) * 4);
  if (toast > 0) {
    ctx.globalAlpha = toast;
    ctx.save();
    ctx.shadowColor = withAlpha(p.ink, 0.18);
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    k.box(1110, 88, 450, 60, 14, p.card);
    ctx.restore();
    k.circle(1140, 118, 7, p.brand);
    k.text(interpolate(c.inquiries.toast, { name: FOCUS_BOOKING.name }), 1160, 124, {
      size: 16,
      weight: 600,
      color: p.ink,
      maxWidth: 385,
    });
    ctx.globalAlpha = 1;
  }
  finishStaffScreen(ctx, k, env);
};

/** Calendar month: the wedding lands on its date with a highlighted cell. */
export const drawCalendar: ScreenDrawer = (ctx, progress, env) => {
  const k = makeKit(ctx, env.theme.fonts);
  const p = env.theme.staff;
  const c = env.copy;
  drawStaffShell(ctx, k, env, "calendar");

  k.box(1310, 98, 250, 46, 12, p.card, p.border);
  k.text("‹", 1336, 129, { size: 24, weight: 600, color: p.muted, align: "center" });
  k.text(env.format.date(CALENDAR_MONTH, "monthYear"), 1435, 128, { size: 18, weight: 700, color: p.ink, align: "center", maxWidth: 160 });
  k.text("›", 1534, 129, { size: 24, weight: 600, color: p.muted, align: "center" });

  const gx = 320, gy = 166, gw = 1240, gh = 798;
  k.box(gx, gy, gw, gh, 18, p.card, p.border);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(gx, gy, gw, gh, 18);
  ctx.clip();
  ctx.fillStyle = p.tableHead;
  ctx.fillRect(gx, gy, gw, 46);
  const cw = gw / 7;
  const ch = (gh - 46) / 5;
  k.tracked(true);
  c.calendar.weekdays.forEach((d, i) =>
    k.text(d.toUpperCase(), gx + i * cw + 16, gy + 30, { size: 13, weight: 700, color: p.muted }),
  );
  k.tracked(false);

  const firstWeekday = (CALENDAR_MONTH.getUTCDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(Date.UTC(CALENDAR_MONTH.getUTCFullYear(), CALENDAR_MONTH.getUTCMonth() + 1, 0)).getUTCDate();
  const daysInPrevious = new Date(Date.UTC(CALENDAR_MONTH.getUTCFullYear(), CALENDAR_MONTH.getUTCMonth(), 0)).getUTCDate();
  const focusDay = FOCUS_BOOKING.date.getUTCDate();
  const arrive = ease(clamp01(progress * 1.8 - 0.25));

  for (let r = 0; r < 5; r += 1) {
    for (let col = 0; col < 7; col += 1) {
      const date = r * 7 + col - firstWeekday + 1;
      const x = gx + col * cw;
      const y = gy + 46 + r * ch;
      if (col >= 5) {
        ctx.fillStyle = p.wash;
        ctx.fillRect(x, y, cw, ch);
      }
      const inMonth = date >= 1 && date <= daysInMonth;
      const label = inMonth ? date : date < 1 ? daysInPrevious + date : date - daysInMonth;
      k.text(String(label), x + 16, y + 30, { size: 16, weight: 600, color: inMonth ? p.ink : p.faint });

      const entry = inMonth ? CALENDAR_ENTRIES[date] : undefined;
      if (entry) {
        const tone = toneColors(p, STATUS_TONE[entry.status]);
        const what = entry.event ? c.events[entry.event] : c.status[entry.status];
        k.box(x + 10, y + 44, cw - 20, 34, 8, tone.bg);
        k.text(`${what} · ${entry.who}`, x + 20, y + 67, { size: 13, weight: 700, color: tone.fg, maxWidth: cw - 40 });
      }
      if (inMonth && date === focusDay && arrive > 0) {
        ctx.globalAlpha = arrive;
        k.box(x + 3, y + 3, cw - 6, ch - 6, 10, undefined, p.brand, 3);
        const drop = (1 - arrive) * -18;
        k.box(x + 10, y + 44 + drop, cw - 20, 34, 8, p.brand);
        k.text(`${c.events[FOCUS_BOOKING.event]} · ${FOCUS_BOOKING.surname}`, x + 20, y + 67 + drop, {
          size: 13,
          weight: 700,
          color: p.onBrand,
          maxWidth: cw - 40,
        });
        k.text(interpolate(c.calendar.guests, { count: FOCUS_BOOKING.guests }), x + 14, y + 104, {
          size: 13,
          weight: 600,
          color: p.muted,
        });
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.fillStyle = p.border;
  for (let col = 1; col < 7; col += 1) ctx.fillRect(gx + col * cw, gy + 46, 1.5, gh - 46);
  for (let r = 0; r < 5; r += 1) ctx.fillRect(gx, gy + 46 + r * ch, gw, 1.5);
  ctx.restore();
  finishStaffScreen(ctx, k, env);
};
