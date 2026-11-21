import { describe, expect, it } from "vitest";

import { buildPackageDescription } from "@/features/pricing/lib/package-description";
import { parsePackageDescription } from "@/lib/pricing/parse-package-description";

describe("buildPackageDescription", () => {
  it("puts the tagline first and one dash line per point, dropping empty points", () => {
    expect(buildPackageDescription("Perfekt for mindre selskap", ["Lokale", "  ", "Bar"])).toBe(
      "Perfekt for mindre selskap\n– Lokale\n– Bar",
    );
  });

  it("strips list markers users typed and works without a tagline", () => {
    expect(buildPackageDescription("", ["- Sluttrenhold", "• Scene", "–  DJ"])).toBe("– Sluttrenhold\n– Scene\n– DJ");
  });

  it("returns an empty string when there is nothing", () => {
    expect(buildPackageDescription("  ", ["", " "])).toBe("");
  });

  it("round-trips through parsePackageDescription", () => {
    const text = buildPackageDescription("Undertittel", ["A", "B"]);
    expect(parsePackageDescription(text)).toEqual({ tagline: "Undertittel", features: ["A", "B"] });
    expect(parsePackageDescription(buildPackageDescription("", ["A"]))).toEqual({ tagline: null, features: ["A"] });
  });
});
