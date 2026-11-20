import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Design guard (docs/design/visual-language.md, section 13): no NEW raw colour values in components.
 * Colours belong in `src/styles/tokens.css` (tokens) and the status scales in `globals.css`.
 * Existing usages are recorded in `raw-colors.baseline.json`; a file may keep or lower its count, never raise it.
 * After removing raw colours, regenerate with: UPDATE_COLOR_BASELINE=1 npx vitest run src/lib/design
 */

const ROOT = path.resolve(__dirname, "../..");
const BASELINE_FILE = path.join(__dirname, "raw-colors.baseline.json");

/** Token sources, e-mail templates (inline colours are required) and the chart colour helper. */
const ALLOWED = [
  "styles/tokens.css",
  "styles/wedding-portal.css",
  "styles/display-density.css",
  "app/globals.css",
  "lib/charts/chart-theme.ts",
  "lib/auth/mail.ts",
  "lib/portal/mail.ts",
  "lib/portal/guest-mail.ts",
  "lib/organizations/invitations/mail.ts",
];

const RAW_COLOR = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-zA-Z-])|rgba?\(\s*\d/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

function currentCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (ALLOWED.includes(rel)) continue;
    const matches = readFileSync(file, "utf8").match(RAW_COLOR);
    if (matches) counts[rel] = matches.length;
  }
  return counts;
}

describe("design token guard", () => {
  it("does not add raw colour values outside the token sources", () => {
    const counts = currentCounts();
    if (process.env.UPDATE_COLOR_BASELINE) {
      const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
      writeFileSync(BASELINE_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
      return;
    }
    const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Record<string, number>;
    const added = Object.entries(counts)
      .filter(([file, n]) => n > (baseline[file] ?? 0))
      .map(([file, n]) => `${file}: ${n} raw colour values (allowed ${baseline[file] ?? 0})`);
    expect(
      added,
      "Use a design token or status class instead of a raw colour. See docs/design/project-profile.md.",
    ).toEqual([]);
  });
});
