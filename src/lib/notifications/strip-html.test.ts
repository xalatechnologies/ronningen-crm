import { describe, expect, it } from "vitest";

import { stripHtmlForNotification } from "@/lib/notifications/create-user-notification";

describe("stripHtmlForNotification", () => {
  it("strips tags and preserves line breaks from paragraphs", () => {
    expect(
      stripHtmlForNotification("<p>Hei Ola.</p><p>Velkommen til Test AS.</p>"),
    ).toBe("Hei Ola.\nVelkommen til Test AS.");
  });

  it("converts br tags to newlines", () => {
    expect(stripHtmlForNotification("Linje 1<br/>Linje 2")).toBe("Linje 1\nLinje 2");
  });

  it("decodes common entities", () => {
    expect(stripHtmlForNotification("A &amp; B &lt; C")).toBe("A & B < C");
  });

  it("trims whitespace", () => {
    expect(stripHtmlForNotification("  <p>  Hei  </p>  ")).toBe("Hei");
  });
});
