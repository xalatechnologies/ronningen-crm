import { describe, expect, it } from "vitest";

import { legalContent } from "@/features/legal/lib/legal-content";
import { LEGAL_DOCUMENT_KEYS } from "@/features/legal/lib/legal-documents";

describe("legal content", () => {
  it.each(LEGAL_DOCUMENT_KEYS)("has the same section count in Norwegian and English for %s", (key) => {
    const nb = legalContent(key, "nb");
    const en = legalContent(key, "en");
    expect(nb.sections.length).toBeGreaterThan(3);
    expect(en.sections.length).toBe(nb.sections.length);
    for (const [i, section] of nb.sections.entries()) {
      expect(en.sections[i]!.body.length).toBe(section.body.length);
    }
  });

  it("never leaves a real secret or personal value in the texts", () => {
    const all = LEGAL_DOCUMENT_KEYS.flatMap((k) => [legalContent(k, "nb"), legalContent(k, "en")]);
    expect(JSON.stringify(all)).not.toMatch(/sk_live|password:|@(?!xala\.no)\w+\.\w+/i);
  });

  it("is final text: no draft or to-do markers", () => {
    const all = LEGAL_DOCUMENT_KEYS.flatMap((k) => [legalContent(k, "nb"), legalContent(k, "en")]);
    expect(JSON.stringify(all)).not.toMatch(/utkast|draft|todo|tbd|lorem/i);
  });

  it("has no unfilled [placeholder] left, and names the company with its organisation number and website", () => {
    for (const key of LEGAL_DOCUMENT_KEYS) {
      for (const locale of ["nb", "en"] as const) {
        const c = legalContent(key, locale);
        const text = [c.title, c.intro, ...c.sections.flatMap((x) => [x.heading, ...x.body])].join("\n");
        expect(text).not.toMatch(/\[[^\]]+\]/);
        expect(text).not.toContain("${");
      }
    }
    const terms = JSON.stringify(legalContent("terms", "nb"));
    expect(terms).toContain("Xala Technologies AS (org.nr. 920 972 454)");
    expect(terms).toContain("xala.no");
  });
});
