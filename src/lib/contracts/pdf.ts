import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { FrozenContractDocument } from "@/lib/contracts/types";
import { sha256Hex } from "@/lib/contracts/crypto";
import {
  CONTRACT_CLOSING_LINE,
  LESSOR_SIGNATURE_NAME,
  formatContractDateTime,
  formatContractLineAmount,
  formatContractNok,
  formatInstallmentDue,
  lessorPlaceDate,
  contractExtraLines,
  contractPartyFacts,
  packageHeadline,
  packageInclusions,
  primaryPackageLine,
  splitContractTermLines,
  summarizeContractExtra,
  type ContractFactRow,
} from "@/lib/contracts/layout";
import {
  chosenPackageLabel,
  contractHeadingIssuerName,
  resolvedLegalTerms,
} from "@/lib/contracts/paper-copy";

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const INK = rgb(0.07, 0.12, 0.1);
const RULE = rgb(0.72, 0.76, 0.74);
const MUTED = rgb(0.32, 0.36, 0.34);

async function loadLessorSignaturePng(): Promise<Uint8Array> {
  const nearby = join(dirname(fileURLToPath(import.meta.url)), "assets/utleier-signatur.png");
  try {
    return await readFile(nearby);
  } catch {
    return await readFile(join(process.cwd(), "public/contracts/utleier-signatur.png"));
  }
}

function toWinAnsi(text: string): string {
  return Array.from(text.normalize("NFC"))
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code === 9 || code === 10 || code === 13) return ch;
      if (code >= 32 && code <= 126) return ch;
      if (code >= 160 && code <= 255) return ch;
      if (ch === "\u2013" || ch === "\u2014" || ch === "\u2212" || ch === "\u2010") return "-";
      if (ch === "\u2022" || ch === "\u00B7" || ch === "\u2018" || ch === "\u2019") {
        return ch === "\u2022" || ch === "\u00B7" ? "-" : "'";
      }
      if (ch === "\u201C" || ch === "\u201D") return '"';
      if (ch === "\u2026") return "...";
      if (ch === "\u00A0") return " ";
      return ch === "\uFEFF" ? "" : "-";
    })
    .join("");
}

function wrapWidth(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const source = toWinAnsi(text).replace(/\r\n/g, "\n");
  const paragraphs = source.split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/(\s+)/);
    let current = "";
    for (const word of words) {
      const next = current + word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && current.trim()) {
        lines.push(current.trimEnd());
        current = word.trimStart();
      } else {
        current = next;
      }
    }
    lines.push(current.trimEnd());
  }
  return lines.length ? lines : [""];
}

function stripBullet(text: string): { bullet: boolean; text: string } {
  const match = /^(?:[•\-–—*]\s+|[-]\s+)/.exec(text.trim());
  if (!match) return { bullet: false, text: text.trim() };
  return { bullet: true, text: text.trim().slice(match[0].length) };
}

class ContractPdf {
  private pdf: PDFDocument;
  private font!: PDFFont;
  private bold!: PDFFont;
  private page!: PDFPage;
  y = 790;
  private readonly left = MARGIN;
  private readonly right = PAGE[0] - MARGIN;
  private readonly width = PAGE[0] - MARGIN * 2;

  constructor(pdf: PDFDocument) {
    this.pdf = pdf;
  }

  async init() {
    this.font = await this.pdf.embedFont(StandardFonts.Helvetica);
    this.bold = await this.pdf.embedFont(StandardFonts.HelveticaBold);
    this.page = this.pdf.addPage(PAGE);
  }

  ensure(height: number) {
    if (this.y - height >= 62) return;
    this.page = this.pdf.addPage(PAGE);
    this.y = 790;
  }

  gap(size = 8) {
    this.y -= size;
  }

  rule() {
    this.ensure(10);
    this.page.drawLine({
      start: { x: this.left, y: this.y },
      end: { x: this.right, y: this.y },
      thickness: 0.8,
      color: RULE,
    });
    this.y -= 12;
  }

  text(
    value: string,
    opts: {
      size?: number;
      bold?: boolean;
      x?: number;
      width?: number;
      color?: ReturnType<typeof rgb>;
      align?: "left" | "center" | "right";
    } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    const x = opts.x ?? this.left;
    const width = opts.width ?? this.right - x;
    const color = opts.color ?? INK;
    for (const line of wrapWidth(value, font, size, width)) {
      this.ensure(size + 5);
      let drawX = x;
      const lineWidth = font.widthOfTextAtSize(line, size);
      if (opts.align === "center") drawX = x + (width - lineWidth) / 2;
      if (opts.align === "right") drawX = x + width - lineWidth;
      this.page.drawText(line, { x: drawX, y: this.y, size, font, color });
      this.y -= size + 4;
    }
  }

  heading(value: string) {
    this.ensure(36);
    this.gap(6);
    this.text(value, { size: 12, bold: true });
    this.gap(2);
  }

  amountRow(label: string, amount: string, bold = false) {
    this.ensure(16);
    const size = 10;
    const font = bold ? this.bold : this.font;
    const amountWidth = this.bold.widthOfTextAtSize(toWinAnsi(amount), size);
    const labelWidth = this.width - amountWidth - 12;
    const y = this.y;
    const lines = wrapWidth(label, font, size, labelWidth);
    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x: this.left,
        y: y - index * (size + 3),
        size,
        font,
        color: INK,
      });
    });
    this.page.drawText(toWinAnsi(amount), {
      x: this.right - amountWidth,
      y,
      size,
      font: this.bold,
      color: INK,
    });
    this.y = y - Math.max(1, lines.length) * (size + 3) - 2;
  }

  bullet(value: string, indent = 0) {
    const size = 10;
    const x = this.left + indent;
    const bulletGap = 12;
    const lines = wrapWidth(value, this.font, size, this.right - x - bulletGap);
    this.ensure((lines.length + 1) * (size + 3));
    this.page.drawText("-", {
      x,
      y: this.y,
      size,
      font: this.font,
      color: INK,
    });
    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x: x + bulletGap,
        y: this.y - index * (size + 3),
        size,
        font: this.font,
        color: INK,
      });
    });
    this.y -= lines.length * (size + 3) + 1;
  }

  factColumn(x: number, width: number, startY: number, rows: ContractFactRow[]): number {
    let y = startY;
    const labelWidth = 52;
    const valueX = x + labelWidth;
    const valueWidth = width - labelWidth;
    for (const row of rows) {
      const label = toWinAnsi(row.label);
      const valueLines = wrapWidth(row.value, this.font, 9.5, valueWidth);
      const block = Math.max(1, valueLines.length) * 13;
      if (y - block < 62) {
        this.page = this.pdf.addPage(PAGE);
        this.y = 790;
        y = this.y;
      }
      this.page.drawText(label, {
        x,
        y,
        size: 9,
        font: this.font,
        color: MUTED,
      });
      valueLines.forEach((line, index) => {
        this.page.drawText(line, {
          x: valueX,
          y: y - index * 13,
          size: 9.5,
          font: this.font,
          color: INK,
        });
      });
      y -= block;
    }
    return y;
  }

  table(rows: { n: string; label: string; due: string; amount: string }[], total: string) {
    const cols = {
      n: this.left,
      label: this.left + 22,
      due: this.left + 268,
      amount: this.right,
    };
    const headerY = this.y;
    this.ensure(40);
    this.page.drawLine({
      start: { x: this.left, y: headerY + 12 },
      end: { x: this.right, y: headerY + 12 },
      thickness: 0.6,
      color: RULE,
    });
    this.page.drawText("#", { x: cols.n, y: headerY, size: 8.5, font: this.bold, color: MUTED });
    this.page.drawText("Beskrivelse", {
      x: cols.label,
      y: headerY,
      size: 8.5,
      font: this.bold,
      color: MUTED,
    });
    this.page.drawText("Forfall", { x: cols.due, y: headerY, size: 8.5, font: this.bold, color: MUTED });
    const amountHeader = toWinAnsi("Beløp");
    this.page.drawText(amountHeader, {
      x: cols.amount - this.bold.widthOfTextAtSize(amountHeader, 8.5),
      y: headerY,
      size: 8.5,
      font: this.bold,
      color: MUTED,
    });
    this.y = headerY - 8;
    this.page.drawLine({
      start: { x: this.left, y: this.y },
      end: { x: this.right, y: this.y },
      thickness: 0.6,
      color: RULE,
    });
    this.y -= 14;
    for (const row of rows) {
      this.ensure(22);
      const labelLines = wrapWidth(row.label, this.font, 9.5, cols.due - cols.label - 8);
      this.page.drawText(toWinAnsi(row.n), {
        x: cols.n,
        y: this.y,
        size: 9.5,
        font: this.font,
        color: INK,
      });
      labelLines.forEach((line, index) => {
        this.page.drawText(line, {
          x: cols.label,
          y: this.y - index * 12,
          size: 9.5,
          font: this.font,
          color: INK,
        });
      });
      this.page.drawText(toWinAnsi(row.due), {
        x: cols.due,
        y: this.y,
        size: 9.5,
        font: this.font,
        color: INK,
      });
      const amount = toWinAnsi(row.amount);
      this.page.drawText(amount, {
        x: cols.amount - this.font.widthOfTextAtSize(amount, 9.5),
        y: this.y,
        size: 9.5,
        font: this.font,
        color: INK,
      });
      this.y -= Math.max(1, labelLines.length) * 12 + 6;
    }
    this.page.drawLine({
      start: { x: this.left, y: this.y + 8 },
      end: { x: this.right, y: this.y + 8 },
      thickness: 0.8,
      color: RULE,
    });
    this.amountRow("TOTALT", total, true);
  }

  async image(bytes: Uint8Array, width: number) {
    const image = await this.pdf.embedPng(bytes);
    const height = (image.height / image.width) * width;
    this.ensure(height + 8);
    this.page.drawImage(image, {
      x: this.left,
      y: this.y - height,
      width,
      height,
    });
    this.y -= height + 4;
  }

  numberPages() {
    const pages = this.pdf.getPages();
    pages.forEach((page, index) => {
      const label = `${index + 1} / ${pages.length}`;
      const size = 8;
      const width = this.font.widthOfTextAtSize(label, size);
      page.drawText(label, {
        x: (PAGE[0] - width) / 2,
        y: 34,
        size,
        font: this.font,
        color: MUTED,
      });
    });
  }
}

export async function buildAcceptedPdf(args: {
  document: FrozenContractDocument;
  acceptedAtIso: string;
  acceptedFullName: string;
}): Promise<{ bytes: Uint8Array; pdfHash: string }> {
  const pdf = await PDFDocument.create();
  const writer = new ContractPdf(pdf);
  await writer.init();
  const d = args.document;
  const pkg = primaryPackageLine(d.booking.lineItems);
  const inclusions = packageInclusions(pkg?.description, pkg?.name);
  const extras = contractExtraLines(d.booking.lineItems);
  const legalTerms = resolvedLegalTerms(d.terms.legalTerms);
  const parties = contractPartyFacts(d);
  const colWidth = (PAGE[0] - MARGIN * 2 - 24) / 2;

  writer.text("LEIEAVTALE", { size: 18, bold: true, align: "center" });
  writer.text(contractHeadingIssuerName(d), { size: 12, bold: true, align: "center" });
  if (pkg) {
    writer.text(packageHeadline(pkg.name), { size: 11, bold: true, align: "center" });
  }
  writer.gap(4);
  writer.rule();

  writer.ensure(120);
  const sectionY = writer.y;
  writer.text("1. Parter i avtalen", { size: 12, bold: true, width: colWidth });
  writer.text("UTLEIER", { size: 9, bold: true, width: colWidth });
  const leftEnd = writer.factColumn(MARGIN, colWidth, writer.y, parties.lessor);

  writer.y = sectionY;
  writer.text("2. Leietakers opplysninger", {
    size: 12,
    bold: true,
    x: MARGIN + colWidth + 24,
    width: colWidth,
  });
  writer.text("LEIETAKER", {
    size: 9,
    bold: true,
    x: MARGIN + colWidth + 24,
    width: colWidth,
  });
  const rightEnd = writer.factColumn(
    MARGIN + colWidth + 24,
    colWidth,
    writer.y,
    parties.lessee,
  );
  writer.y = Math.min(leftEnd, rightEnd) - 6;
  writer.rule();

  writer.heading("3. Leiesum og betalingsplan");
  if (pkg) {
    writer.amountRow(chosenPackageLabel(pkg.name), formatContractNok(pkg.unitAmountNok), true);
  }
  if (inclusions.tagline) writer.text(inclusions.tagline, { size: 10, bold: true });
  for (const feature of inclusions.features) writer.bullet(feature, 4);
  if (inclusions.footer) writer.text(inclusions.footer, { size: 9, color: MUTED });
  if (extras.length) {
    writer.gap(6);
    writer.text("TILLEGG", { size: 9, bold: true });
    for (const item of extras) {
      writer.amountRow(item.name, formatContractLineAmount(item.unitAmountNok));
      const note = summarizeContractExtra(item.description);
      const showNote =
        Boolean(note) && !(item.unitAmountNok === 0 && /avtale/i.test(note ?? ""));
      if (showNote && note) writer.text(note, { size: 8.5, color: MUTED });
    }
  }
  writer.gap(8);
  writer.text("BETALINGSPLAN", { size: 9, bold: true });
  const rows = d.booking.installments.length
    ? d.booking.installments.map((row, index) => ({
        n: String(index + 1),
        label: row.label,
        due: formatInstallmentDue(row.dueDate, d.booking.eventStart),
        amount: formatContractNok(row.amountNok),
        amountNok: row.amountNok,
      }))
    : [
        {
          n: "1",
          label: "Avtalt total",
          due: "Ved signering",
          amount: formatContractNok(d.booking.totalNok),
          amountNok: d.booking.totalNok,
        },
      ];
  const tableTotal = rows.reduce((sum, row) => sum + row.amountNok, 0);
  writer.table(
    rows.map(({ n, label, due, amount }) => ({ n, label, due, amount })),
    formatContractNok(tableTotal),
  );
  if (d.issuer.bankAccount) {
    writer.text(`Kontonummer for betaling: ${d.issuer.bankAccount}`, { size: 9.5 });
  }
  writer.text(d.terms.paymentTerms || "Merk betaling med: Arrangementsdato og navn", {
    size: 9,
    bold: true,
  });

  if (legalTerms) {
    for (const line of splitContractTermLines(legalTerms)) {
      if (!line.text.trim()) {
        writer.gap(6);
        continue;
      }
      if (line.kind === "section") {
        writer.heading(line.text.trim());
        continue;
      }
      if (line.kind === "subtitle") {
        writer.ensure(28);
        writer.gap(4);
        writer.text(line.text.trim(), { size: 10, bold: true });
        continue;
      }
      const parsed = stripBullet(line.text);
      if (parsed.bullet) {
        writer.bullet(parsed.text);
        continue;
      }
      if (/Passord:/i.test(line.text)) {
        writer.text(line.text, { size: 10, bold: true });
        continue;
      }
      writer.text(line.text, { size: 10 });
    }
  }
  if (d.terms.specialTerms.trim()) {
    writer.heading("Særlige avtalevilkår");
    writer.text(d.terms.specialTerms);
  }
  if (d.booking.customerFacingNotes?.trim()) {
    writer.heading("Merknader");
    writer.text(d.booking.customerFacingNotes);
  }

  writer.heading("8. Signatur");
  writer.text(
    d.terms.acceptanceDeclaration ||
      "Jeg bekrefter å ha lest og forstått leieavtalen, informasjonsskrivet og ryddeplanen.",
  );
  writer.gap(8);
  writer.ensure(140);
  const signTop = writer.y;
  writer.text("UTLEIER", { size: 9, bold: true, width: colWidth });
  await writer.image(await loadLessorSignaturePng(), 160);
  writer.text(LESSOR_SIGNATURE_NAME, { size: 10, bold: true, width: colWidth });
  writer.text(`Sted/Dato: ${lessorPlaceDate(d)}`, { size: 9.5, width: colWidth });
  const leftSignEnd = writer.y;

  writer.y = signTop;
  writer.text("LEIETAKER", {
    size: 9,
    bold: true,
    x: MARGIN + colWidth + 24,
    width: colWidth,
  });
  writer.gap(28);
  writer.text(args.acceptedFullName, {
    size: 12,
    bold: true,
    x: MARGIN + colWidth + 24,
    width: colWidth,
  });
  writer.text(d.customer.name, {
    size: 10,
    x: MARGIN + colWidth + 24,
    width: colWidth,
  });
  writer.text(`Sted/Dato: ${formatContractDateTime(args.acceptedAtIso)}`, {
    size: 9.5,
    x: MARGIN + colWidth + 24,
    width: colWidth,
  });
  writer.y = Math.min(leftSignEnd, writer.y) - 10;
  writer.text(CONTRACT_CLOSING_LINE, { size: 9, align: "center" });

  writer.numberPages();
  const bytes = await pdf.save();
  return { bytes: bytes, pdfHash: sha256Hex(Buffer.from(bytes)) };
}
