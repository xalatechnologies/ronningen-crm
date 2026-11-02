#!/usr/bin/env node
/**
 * Read-only RLS migration scanner.
 * Usage: node scripts/security/rls-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");

const TENANT_TABLE_HINTS = [
  "bookings",
  "customers",
  "transactions",
  "properties",
  "organization_members",
  "subscriptions",
  "assets",
  "booking_inquiries",
  "accommodation",
];

function readMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    console.error("Migrations directory not found:", migrationsDir);
    process.exit(1);
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => ({
      file,
      sql: fs.readFileSync(path.join(migrationsDir, file), "utf8"),
    }));
}

function scan() {
  const migrations = readMigrations();
  let rlsEnableCount = 0;
  let policyCount = 0;
  const policies = [];
  const rlsTables = new Set();
  const createTables = new Set();

  for (const { file, sql } of migrations) {
    const enableMatches = sql.matchAll(
      /ALTER TABLE\s+(?:public\.)?(\w+)\s+ENABLE ROW LEVEL SECURITY/gi,
    );
    for (const m of enableMatches) {
      rlsEnableCount++;
      rlsTables.add(m[1]);
    }

    const policyMatches = sql.matchAll(
      /CREATE POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?(\w+)/gi,
    );
    for (const m of policyMatches) {
      policyCount++;
      policies.push({ name: m[1], table: m[2], file });
    }

    const tableMatches = sql.matchAll(
      /CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?(\w+)/gi,
    );
    for (const m of tableMatches) {
      createTables.add(m[1]);
    }
  }

  const tenantTablesWithoutRls = TENANT_TABLE_HINTS.filter(
    (t) => createTables.has(t) && !rlsTables.has(t),
  );

  console.log("RLS Migration Audit");
  console.log("===================");
  console.log(`Migration files: ${migrations.length}`);
  console.log(`RLS ENABLE statements: ${rlsEnableCount}`);
  console.log(`CREATE POLICY statements: ${policyCount}`);
  console.log(`Tables with RLS enabled: ${rlsTables.size}`);
  console.log("");

  if (tenantTablesWithoutRls.length > 0) {
    console.log("WARN: Tenant tables created but no RLS ENABLE found:");
    for (const t of tenantTablesWithoutRls) {
      console.log(`  - ${t}`);
    }
    console.log("");
  } else {
    console.log("OK: Known tenant tables have RLS ENABLE in migrations.");
    console.log("");
  }

  const tablesWithPolicies = new Set(policies.map((p) => p.table));
  const rlsWithoutPolicies = [...rlsTables].filter(
    (t) => !tablesWithPolicies.has(t),
  );
  if (rlsWithoutPolicies.length > 0) {
    console.log("INFO: Tables with RLS but no CREATE POLICY in migrations:");
    for (const t of rlsWithoutPolicies) {
      console.log(`  - ${t}`);
    }
    console.log("");
  }

  console.log("Policy count by table (top 15):");
  const byTable = policies.reduce((acc, p) => {
    acc[p.table] = (acc[p.table] ?? 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));
  Object.entries(byTable)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([table, count]) => console.log(`  ${table}: ${count}`));

  console.log("");
  console.log("Done. Review docs/rls-security-checklist.md for manual verification.");
}

scan();
