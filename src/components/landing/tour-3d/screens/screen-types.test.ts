import { describe, expect, it } from "vitest";

import { createScreenFormat } from "@/components/landing/tour-3d/screens/screen-types";

const wedding = new Date(Date.UTC(2027, 5, 14, 12));
const spaces = (s: string) => s.replace(/\s/g, " ");

describe("createScreenFormat", () => {
  it("formats Norwegian money and dates the way the app shows them", () => {
    const f = createScreenFormat("nb");
    expect(spaces(f.money(48500))).toBe("48 500 kr");
    expect(f.date(wedding, "short")).toBe("14. juni 2027");
    expect(f.date(new Date(Date.UTC(2026, 11, 5, 12)), "short")).toBe("5. des 2026");
    expect(f.date(wedding, "monthYear")).toBe("Juni 2027");
  });

  it("formats English money and dates", () => {
    const f = createScreenFormat("en");
    expect(spaces(f.money(48500))).toBe("NOK 48,500");
    expect(f.date(wedding, "dayMonth")).toBe("14 Jun");
  });

  it("rounds amounts that are mid-animation", () => {
    expect(spaces(createScreenFormat("nb").money(1234.6))).toBe("1 235 kr");
  });
});
