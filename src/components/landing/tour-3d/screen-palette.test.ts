import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { PORTAL_TOKENS, STAFF_TOKENS, resolveTokens, withAlpha } from "@/components/landing/tour-3d/screen-palette";

const styles = (file: string) => readFileSync(path.resolve(__dirname, "../../../styles", file), "utf8");

describe("screen palette", () => {
  it("only uses tokens that exist in the token sources", () => {
    const tokens = styles("tokens.css");
    const portal = styles("wedding-portal.css");
    for (const name of Object.values(STAFF_TOKENS)) {
      expect(tokens, `${name} in tokens.css`).toContain(`${name}:`);
    }
    for (const name of Object.values(PORTAL_TOKENS)) {
      expect(`${tokens}\n${portal}`, `${name} in tokens.css or wedding-portal.css`).toContain(`${name}:`);
    }
  });

  it("reads every token and trims the value", () => {
    const read = (name: string) => ` value-of${name} `;
    expect(resolveTokens({ brand: "--rn-primary" }, read)).toEqual({ brand: "value-of--rn-primary" });
  });

  it("adds transparency to hex colours and leaves other formats alone", () => {
    expect(withAlpha("#3d62cf", 0.5)).toBe("rgba(61, 98, 207, 0.5)");
    expect(withAlpha(" #fff ", 0.25)).toBe("rgba(255, 255, 255, 0.25)");
    expect(withAlpha("oklch(0.6 0.1 250)", 0.5)).toBe("oklch(0.6 0.1 250)");
  });
});
