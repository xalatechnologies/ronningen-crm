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

  it("never leaves a real secret or personal value in the drafts", () => {
    const all = LEGAL_DOCUMENT_KEYS.flatMap((k) => [legalContent(k, "nb"), legalContent(k, "en")]);
    expect(JSON.stringify(all)).not.toMatch(/sk_live|password:|@(?!xala\.no)\w+\.\w+/i);
  });
});
