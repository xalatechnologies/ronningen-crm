import { describe, expect, it } from "vitest";

import { renderTemplate } from "@/lib/notifications/render-template";

describe("renderTemplate", () => {
  it("replaces variables in body", () => {
    const html = "<p>Hei {{name}}, velkommen til {{organization}}.</p>";
    expect(
      renderTemplate(html, {
        name: "Ola",
        organization: "Test AS",
      }),
    ).toBe("<p>Hei Ola, velkommen til Test AS.</p>");
  });

  it("removes unknown variables", () => {
    expect(renderTemplate("{{missing}}", {})).toBe("");
  });

  it("handles spaced placeholders", () => {
    expect(renderTemplate("{{ trial_end_date }}", { trial_end_date: "1. juli" })).toBe(
      "1. juli",
    );
  });
});
