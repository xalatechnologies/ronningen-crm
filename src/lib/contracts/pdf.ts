import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
} from "@/lib/contracts/layout";
import {
  chosenPackageLabel,
  contractHeadingIssuerName,
  resolvedLegalTerms,
} from "@/lib/contracts/paper-copy";

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
      return "?";
    })
    .join("");
}

function wrap(text: string, width: number): string[] {
  const words = toWinAnsi(text).replace(/\r\n/g, "\n").split(/(\s+)/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.includes("\n")) {
      const parts = word.split("\n");
      current += parts[0] ?? "";
      lines.push(current);
      for (let i = 1; i < parts.length - 1; i += 1) {
        lines.push(parts[i] ?? "");
      }
      current = parts[parts.length - 1] ?? "";
      continue;
    }
    if ((current + word).length > width) {
      if (current) lines.push(current);
      current = word.trimStart();
    } else {
      current += word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function buildAcceptedPdf(args: {
  document: FrozenContractDocument;
  acceptedAtIso: string;
  acceptedFullName: string;
}): Promise<{ bytes: Uint8Array; pdfHash: string }> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const signatureImage = await pdf.embedPng(await loadLessorSignaturePng());
  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdf.addPage(pageSize);
  let y = 800;
  const left = 48;

  const draw = (text: string, size = 10, isBold = false) => {
    const use = isBold ? bold : font;
    for (const line of wrap(text, isBold ? 88 : 96)) {
      if (y < 56) {
        page = pdf.addPage(pageSize);
        y = 800;
      }
      page.drawText(line, {
        x: left,
        y,
        size,
        font: use,
        color: rgb(0.07, 0.12, 0.1),
      });
      y -= size + 4;
    }
  };

  const d = args.document;
  const pkg = primaryPackageLine(d.booking.lineItems);
  const inclusions = packageInclusions(pkg?.description, pkg?.name);
  const extras = contractExtraLines(d.booking.lineItems);
  const legalTerms = resolvedLegalTerms(d.terms.legalTerms);
  const parties = contractPartyFacts(d);

  draw("LEIEAVTALE", 18, true);
  draw(contractHeadingIssuerName(d), 12, true);
  if (pkg) draw(packageHeadline(pkg.name), 12, true);
  y -= 8;

  draw("1. Parter i avtalen", 12, true);
  draw("Utleier", 10, true);
  for (const row of parties.lessor) draw(`${row.label}  ${row.value}`);
  y -= 6;

  draw("2. Leietakers opplysninger", 12, true);
  draw("Leietaker", 10, true);
  for (const row of parties.lessee) draw(`${row.label}  ${row.value}`);
  y -= 6;

  draw("3. Leiesum og betalingsplan", 12, true);
  if (pkg) {
    draw(`${chosenPackageLabel(pkg.name)}  ${formatContractNok(pkg.unitAmountNok)}`, 10, true);
  }
  if (inclusions.tagline) draw(inclusions.tagline, 10, true);
  for (const feature of inclusions.features) draw(`– ${feature}`);
  if (inclusions.footer) draw(inclusions.footer);
  if (extras.length) {
    draw("Tillegg", 10, true);
    for (const item of extras) {
      draw(`${item.name}  ${formatContractLineAmount(item.unitAmountNok)}`);
      const note = summarizeContractExtra(item.description);
      if (note) draw(note);
    }
  }
  y -= 4;
  draw("Betalingsplan", 10, true);
  draw("#  Beskrivelse  Forfallsdato  Beløp", 10, true);
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
  for (const row of rows) {
    draw(`${row.n}  ${row.label}  ${row.due}  ${row.amount}`);
  }
  const tableTotal = rows.reduce((sum, row) => sum + row.amountNok, 0);
  draw(`TOTALT  ${formatContractNok(tableTotal)}`, 10, true);
  if (d.issuer.bankAccount) draw(`Kontonummer for betaling: ${d.issuer.bankAccount}`);
  draw(d.terms.paymentTerms || "Merk betaling med: Arrangementsdato og navn", 10, true);
  y -= 6;

  if (legalTerms) {
    for (const line of splitContractTermLines(legalTerms)) {
      if (!line.text.trim()) {
        y -= 6;
        continue;
      }
      if (line.kind === "section") {
        y -= 4;
        draw(line.text.trim(), 12, true);
        continue;
      }
      if (line.kind === "subtitle") {
        y -= 2;
        draw(line.text.trim(), 10, true);
        continue;
      }
      if (/Passord:/i.test(line.text)) {
        draw(line.text, 10, true);
        continue;
      }
      draw(line.text);
    }
    y -= 6;
  }
  if (d.terms.specialTerms.trim()) {
    draw("Særlige avtalevilkår", 12, true);
    draw(d.terms.specialTerms);
    y -= 6;
  }

  draw("8. Signatur", 12, true);
  draw(
    d.terms.acceptanceDeclaration ||
      "Jeg bekrefter å ha lest og forstått leieavtalen, informasjonsskrivet og ryddeplanen.",
  );
  y -= 4;
  draw("UTLEIER", 10, true);
  const sigWidth = 200;
  const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
  if (y - sigHeight < 56) {
    page = pdf.addPage(pageSize);
    y = 800;
  }
  page.drawImage(signatureImage, {
    x: left,
    y: y - sigHeight,
    width: sigWidth,
    height: sigHeight,
  });
  y -= sigHeight + 6;
  draw(LESSOR_SIGNATURE_NAME, 11, true);
  draw(`Sted/Dato: ${lessorPlaceDate(d)}`);
  y -= 4;
  draw("LEIETAKER", 10, true);
  draw(args.acceptedFullName, 11, true);
  draw(`Sted/Dato: ${formatContractDateTime(args.acceptedAtIso)}`);
  y -= 8;
  draw(CONTRACT_CLOSING_LINE);

  const bytes = await pdf.save();
  return { bytes, pdfHash: sha256Hex(Buffer.from(bytes)) };
}
