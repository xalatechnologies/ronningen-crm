import type { FrozenContractDocument, FrozenLineItem } from "@/lib/contracts/types";
import {
  contractHeadingIssuerName,
  resolvePackageInclusions,
} from "@/lib/contracts/paper-copy";

export const CONTRACT_CLOSING_LINE =
  "Rønningen sitt vertskap skal gjøre alt i vår makt for at deres dag blir den fineste av de alle!";

export const LESSOR_SIGNATURE_NAME = "Hameed Rahmani";
export const LESSOR_SIGNATURE_SRC = "/contracts/utleier-signatur.png";

export function packageHeadline(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const upper = trimmed.toLocaleUpperCase("nb-NO");
  if (/\bPAKKE/.test(upper)) return upper;
  return `${upper} PAKKE`;
}

export function primaryPackageLine(
  items: FrozenLineItem[],
): FrozenLineItem | null {
  return items.find((item) => item.kind === "package") ?? items[0] ?? null;
}

export function contractExtraLines(items: FrozenLineItem[]): FrozenLineItem[] {
  const pkg = primaryPackageLine(items);
  return items.filter((item) => item !== pkg && item.kind !== "adjustment");
}

export function packageInclusions(
  description: string | null | undefined,
  packageName?: string | null,
) {
  return resolvePackageInclusions(description, packageName);
}

const SALES_COPY =
  /vi tilbyr|pakkene kan|fullpakker|fra\s*\d[\d.\s]*kr|scenedekor|vielsesdekor/i;

export function summarizeContractExtra(
  description: string | null | undefined,
): string | null {
  const parsed = packageInclusions(description);
  const parts = [parsed.tagline, ...parsed.features, parsed.footer].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  if (!parts.length) return null;
  const blob = parts.join(" ");
  if (SALES_COPY.test(blob)) {
    const tag = parsed.tagline?.trim() ?? "";
    if (tag && !SALES_COPY.test(tag) && tag.length <= 90) return tag;
    return null;
  }
  const compact = [parsed.tagline, parsed.features.join(", "), parsed.footer]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" — ");
  if (compact.length <= 160) return compact;
  return parsed.tagline?.trim() || null;
}

export function formatContractLineAmount(amount: number): string {
  if (amount === 0) return "Avtales";
  return formatContractNok(amount);
}

export type ContractFactRow = { label: string; value: string };

function fact(label: string, value: string | null | undefined): ContractFactRow | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return { label, value: trimmed };
}

export function contractPartyFacts(doc: FrozenContractDocument): {
  lessor: ContractFactRow[];
  lessee: ContractFactRow[];
} {
  const eventValue = /\d{2}:\d{2}/.test(doc.booking.eventStart)
    ? formatContractDateTime(doc.booking.eventStart)
    : formatContractDate(doc.booking.eventStart);
  return {
    lessor: [
      fact("Navn", contractHeadingIssuerName(doc)),
      fact("Org.nr", doc.issuer.orgNumber),
      fact("Adresse", doc.issuer.addressLines.filter(Boolean).join(", ")),
      fact("Telefon", doc.issuer.phone),
      fact("E-post", doc.issuer.email),
    ].filter((row): row is ContractFactRow => Boolean(row)),
    lessee: [
      fact("Navn", doc.customer.name),
      fact("Firma", doc.customer.companyName),
      fact("E-post", doc.customer.email ?? "—"),
      fact("Telefon", doc.customer.phone ?? "—"),
      fact("Adresse", doc.customer.address),
      fact("Lokale", doc.booking.venueName),
      fact("Dato", eventValue),
      fact("Gjester", String(doc.booking.guestCount)),
    ].filter((row): row is ContractFactRow => Boolean(row)),
  };
}

export function formatInstallmentDue(
  dueDate: string | null | undefined,
  eventStart?: string | null,
): string {
  if (!dueDate?.trim()) return "Ved signering";
  if (eventStart) {
    const dueMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueDate.trim());
    const eventMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(eventStart.trim());
    if (dueMatch && eventMatch) {
      const dueMonths = Number(dueMatch[1]) * 12 + Number(dueMatch[2]);
      const eventMonths = Number(eventMatch[1]) * 12 + Number(eventMatch[2]);
      if (eventMonths - dueMonths === 3 && dueMatch[3] === eventMatch[3]) {
        return "3 mnd. før arrangementet";
      }
    }
  }
  return formatContractDate(dueDate);
}

export function formatContractDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return value.trim();
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function formatContractDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && /T|\d{2}:\d{2}/.test(value)) {
    const date = new Intl.DateTimeFormat("nb-NO", {
      timeZone: "Europe/Oslo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed);
    const time = new Intl.DateTimeFormat("nb-NO", {
      timeZone: "Europe/Oslo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(parsed);
    return `${date}, ${time}`;
  }
  return formatContractDate(value);
}

export function formatContractNok(amount: number): string {
  const rounded = Math.round(amount);
  const grouped = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return `kr ${rounded < 0 ? "\u2212" : ""}${grouped},-`;
}

export function letterheadContactLine(doc: FrozenContractDocument): string {
  const parts = [
    doc.issuer.addressLines.join(", "),
    doc.issuer.phone ? `Tlf: ${doc.issuer.phone}` : "",
    doc.issuer.email ?? "",
  ].filter(Boolean);
  return parts.join(" | ");
}

export function lessorPlaceDate(doc: FrozenContractDocument): string {
  const city = doc.issuer.city?.trim() || "Sylling";
  return `${city}, ${formatContractDate(doc.issuedAt)}`;
}

export type ContractTermLineKind = "section" | "subtitle" | "body";

export function contractTermLineKind(
  line: string,
  nextNonEmptyLine?: string,
): ContractTermLineKind {
  const trimmed = line.trim();
  if (!trimmed) return "body";
  if (/^\d+\.\s+\S/.test(trimmed)) return "section";
  if (/^[•\-–—*]\s/.test(trimmed)) return "body";
  const next = nextNonEmptyLine?.trim() ?? "";
  const nextIsBullet = /^[•\-–—*]\s/.test(next);
  const isShortTitle =
    trimmed.length <= 48 &&
    !/[.!?:]$/.test(trimmed) &&
    !trimmed.includes("•");
  if (isShortTitle && nextIsBullet) return "subtitle";
  return "body";
}

export function splitContractTermLines(text: string): {
  text: string;
  kind: ContractTermLineKind;
}[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return lines.map((line, index) => {
    const nextNonEmpty = lines.slice(index + 1).find((candidate) => candidate.trim());
    return {
      text: line,
      kind: contractTermLineKind(line, nextNonEmpty),
    };
  });
}

export function emphasizeWifiPassword(
  text: string,
): { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = [];
  const pattern = /(Passord:\s*)(\S+)/gi;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ text: text.slice(lastIndex, start), bold: false });
    }
    parts.push({ text: match[1] ?? "", bold: false });
    parts.push({ text: match[2] ?? "", bold: true });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), bold: false });
  }
  return parts.length ? parts : [{ text, bold: false }];
}
