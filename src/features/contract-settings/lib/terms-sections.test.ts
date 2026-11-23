import { describe, expect, it } from "vitest";

import {
  moveItem,
  nextSectionNumber,
  parseTermsSections,
  removeItem,
  replaceItem,
  serializeTermsSections,
} from "@/features/contract-settings/lib/terms-sections";
import { splitContractTermLines } from "@/lib/contracts/layout";

const TEXT = `4. Betingelser
• Reservasjon er gyldig etter første innbetaling er mottatt.
• Leietaker må være over 23 år og ha bosted i Norge.

6. Informasjonsskriv og husregler
Følgende regler gjelder for arrangementet og skal formidles til alle gjester:

Adkomst og parkering
• Fartsgrensen på innkjøringsveien er 30 km/t.

Tider og støy
• Alle vinduer og dører må være lukket senest kl. 01:00.
• Lokalet må være forlatt senest kl. 02:30.

Røyking og fyrverkeri
• Fyrverkeri er FORBUDT.`;

describe("parseTermsSections", () => {
  it("reads numbered sections, their intro lines, and titled blocks", () => {
    const sections = parseTermsSections(TEXT);
    expect(sections.map((s) => s.heading)).toEqual(["4. Betingelser", "6. Informasjonsskriv og husregler"]);
    expect(sections[0]?.intro).toHaveLength(2);
    expect(sections[1]?.intro).toEqual(["Følgende regler gjelder for arrangementet og skal formidles til alle gjester:"]);
    expect(sections[1]?.groups.map((g) => g.title)).toEqual(["Adkomst og parkering", "Tider og støy", "Røyking og fyrverkeri"]);
    expect(sections[1]?.groups[1]?.lines).toHaveLength(2);
  });

  it("gives text before the first numbered heading its own section without a heading", () => {
    const sections = parseTermsSections("Innledning\n\n1. Vilkår\n• Punkt");
    expect(sections[0]).toMatchObject({ heading: null });
    expect(sections[0]?.groups[0]?.lines).toEqual(["Innledning"]);
    expect(sections[1]?.heading).toBe("1. Vilkår");
  });

  it("returns no sections for empty text", () => {
    expect(parseTermsSections("")).toEqual([]);
    expect(parseTermsSections("  \n \n")).toEqual([]);
  });
});

describe("serializeTermsSections", () => {
  it("gives back exactly the same text for well-formed terms", () => {
    expect(serializeTermsSections(parseTermsSections(TEXT))).toBe(TEXT);
  });

  it("is stable: reading and writing twice changes nothing", () => {
    const once = serializeTermsSections(parseTermsSections(TEXT));
    expect(serializeTermsSections(parseTermsSections(once))).toBe(once);
  });

  it("only tidies blank space: extra blank lines and Windows line breaks", () => {
    const messy = "1. A\r\n• x\r\n\r\n\r\n\r\nTitle\r\n• y\r\n";
    expect(serializeTermsSections(parseTermsSections(messy))).toBe("1. A\n• x\n\nTitle\n• y");
  });

  it("drops empty lines, empty blocks and empty titles that editing leaves behind", () => {
    const text = serializeTermsSections([
      { heading: "1. A", intro: ["", "ok"], groups: [{ title: "  ", lines: ["", " "] }, { title: "T", lines: ["• p", ""] }] },
    ]);
    expect(text).toBe("1. A\nok\n\nT\n• p");
  });

  it("renders the same headings and titles on the contract before and after", () => {
    const kinds = (t: string) => splitContractTermLines(t).filter((l) => l.text.trim()).map((l) => [l.kind, l.text]);
    expect(kinds(serializeTermsSections(parseTermsSections(TEXT)))).toEqual(kinds(TEXT));
  });
});

describe("list helpers", () => {
  it("numbers a new section after the highest existing number", () => {
    expect(nextSectionNumber(parseTermsSections(TEXT))).toBe(7);
    expect(nextSectionNumber([])).toBe(1);
  });

  it("moves, removes and replaces without changing the original", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(list, 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveItem(list, 2, 1)).toEqual(["a", "b", "c"]);
    expect(removeItem(list, 1)).toEqual(["a", "c"]);
    expect(replaceItem(list, 2, "z")).toEqual(["a", "b", "z"]);
    expect(list).toEqual(["a", "b", "c"]);
  });
});
