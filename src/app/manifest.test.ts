import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("web app manifest", () => {
  const m = manifest();

  it("meets the install criteria", () => {
    expect(m.name && m.short_name).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/open?source=pwa");
    expect(m.id).toBe("/");
  });

  it("has 192, 512 and maskable icons that exist on disk", () => {
    const icons = m.icons ?? [];
    const has = (size: string, purpose: string) => icons.some((i) => i.sizes === size && i.purpose === purpose);
    expect(has("192x192", "any")).toBe(true);
    expect(has("512x512", "any")).toBe(true);
    expect(has("512x512", "maskable")).toBe(true);
    for (const icon of icons) expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
  });
});
