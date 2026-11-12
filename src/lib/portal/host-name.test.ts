import { describe, expect, it } from "vitest";

import { sanitizeHostName } from "./host-name";

const venue = "Rønningen";

describe("sanitizeHostName", () => {
  it("keeps normal names, including accents and punctuation", () => {
    expect(sanitizeHostName("Kari Nordmann", venue)).toBe("Kari Nordmann");
    expect(sanitizeHostName("Åse & Øyvind Bø-Hansen", venue)).toBe("Åse & Øyvind Bø-Hansen");
    expect(sanitizeHostName("Dr. O'Neil", venue)).toBe("Dr. O'Neil");
  });
  it("strips digits and symbols so a phone number cannot ride in the sender name", () => {
    expect(sanitizeHostName("Vipps support 4123 4567", venue)).toBe("Vipps support");
    expect(sanitizeHostName("Kari <b>Nordmann</b>", venue)).toBe("Kari bNordmannb");
  });
  it("never lets a header break through: a CR/LF name is reduced to letters, a link-like remainder falls back", () => {
    expect(sanitizeHostName("Kari\r\nBcc: evil@x.no", venue)).toBe(venue);
    expect(sanitizeHostName("Kari\r\nNordmann", venue)).toBe("KariNordmann"); // control characters are gone
  });
  it("falls back to the venue name when what is left looks like a link or is too short", () => {
    expect(sanitizeHostName("bank-secure.shop", venue)).toBe(venue);
    expect(sanitizeHostName("claim refund at www.x", venue)).toBe(venue);
    expect(sanitizeHostName("12345", venue)).toBe(venue);
    expect(sanitizeHostName("", venue)).toBe(venue);
    expect(sanitizeHostName("aaaaaaaaaa", venue)).toBe(venue);
  });
  it("is bounded in length", () => {
    expect(sanitizeHostName("A".repeat(10) + " " + "b".repeat(100), venue).length).toBeLessThanOrEqual(60);
  });
});
