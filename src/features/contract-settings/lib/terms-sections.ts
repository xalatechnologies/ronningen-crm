import { contractTermLineKind } from "@/lib/contracts/layout";

/**
 * The contract terms are stored as one text. The contract page already reads that text as numbered sections
 * ("6. House rules"), small titles over bullet lists, and plain lines. These helpers show the same structure
 * as editable blocks and write it back to the identical text format, so nothing stored or already sent changes.
 */

/** A small titled block of lines, such as "Parking" with its bullets. `title` is null for a plain paragraph. */
export type TermsGroup = { title: string | null; lines: string[] };

/** A numbered section: its heading line, lines directly under the heading, and the blocks after it. */
export type TermsSection = { heading: string | null; intro: string[]; groups: TermsGroup[] };

const isBlank = (line: string) => line.trim() === "";

/** Splits the text into runs of non-empty lines. Any number of blank lines between runs counts as one gap. */
function toBlocks(text: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (isBlank(line)) {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

export function parseTermsSections(text: string): TermsSection[] {
  const sections: TermsSection[] = [];
  for (const block of toBlocks(text)) {
    const [first = "", ...rest] = block;
    const kind = contractTermLineKind(first, rest[0]);
    if (kind === "section") {
      sections.push({ heading: first, intro: rest, groups: [] });
      continue;
    }
    if (sections.length === 0) sections.push({ heading: null, intro: [], groups: [] });
    const current = sections[sections.length - 1]!;
    current.groups.push(kind === "subtitle" ? { title: first, lines: rest } : { title: null, lines: block });
  }
  return sections;
}

/** Writes the sections back as text: one blank line between blocks, empty lines and empty blocks dropped. */
export function serializeTermsSections(sections: readonly TermsSection[]): string {
  const blocks: string[][] = [];
  for (const section of sections) {
    const head = [...(section.heading != null && !isBlank(section.heading) ? [section.heading] : []), ...section.intro.filter((l) => !isBlank(l))];
    if (head.length) blocks.push(head);
    for (const group of section.groups) {
      const lines = [...(group.title != null && !isBlank(group.title) ? [group.title] : []), ...group.lines.filter((l) => !isBlank(l))];
      if (lines.length) blocks.push(lines);
    }
  }
  return blocks.map((block) => block.join("\n")).join("\n\n");
}

/** The number a new section should get: one more than the highest leading number in the headings. */
export function nextSectionNumber(sections: readonly TermsSection[]): number {
  const numbers = sections.map((s) => /^(\d+)\./.exec(s.heading ?? "")?.[1]).filter((n): n is string => n != null).map(Number);
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

/** A copy of the list with the item at `index` moved one step up (-1) or down (+1); unchanged at the ends. */
export function moveItem<T>(items: readonly T[], index: number, step: -1 | 1): T[] {
  const target = index + step;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function removeItem<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}

export function replaceItem<T>(items: readonly T[], index: number, value: T): T[] {
  return items.map((item, i) => (i === index ? value : item));
}
