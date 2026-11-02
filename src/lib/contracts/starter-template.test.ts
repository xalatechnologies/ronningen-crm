import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  join(process.cwd(), "supabase/migrations/20261102160000_template_signature_and_starter.sql"),
  "utf8",
);

describe("neutral starter template", () => {
  it("contains no organization-specific names", () => {
    const body = SQL.slice(SQL.indexOf("seed_starter_contract_template"));
    expect(body).not.toMatch(/rønningen|ronningen|hameed|rahmani|sylling/i);
  });

  it("is seeded through the neutral function by the app", () => {
    const actions = readFileSync(join(process.cwd(), "src/lib/contracts/actions.ts"), "utf8");
    expect(actions).toContain('"seed_starter_contract_template"');
    expect(actions).not.toContain('"seed_default_contract_template"');
  });
});
