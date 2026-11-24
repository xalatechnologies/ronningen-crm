import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LegalDocumentView } from "@/features/legal/components/legal-document-view";
import { legalContent } from "@/features/legal/lib/legal-content";

afterEach(cleanup);

describe("LegalDocumentView", () => {
  it("shows the title, a draft notice, and a contents link for every numbered section", () => {
    const content = legalContent("terms", "nb");
    render(<LegalDocumentView content={content} version="v1" labels={{ back: "Tilbake", draft: "Utkast", version: "Versjon v1", contents: "Innhold" }} />);
    expect(screen.getByRole("heading", { level: 1, name: "Brukervilkår" })).toBeTruthy();
    expect(screen.getByText("Utkast")).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Innhold" });
    expect(nav.querySelectorAll("a")).toHaveLength(content.sections.length);
    expect(document.getElementById("section-1")).toBeTruthy();
  });
});
