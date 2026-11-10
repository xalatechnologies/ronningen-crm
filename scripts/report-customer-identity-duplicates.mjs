/**
 * Read-only report of identity collisions that would block unique indexes.
 * Does NOT delete, merge, or modify any rows.
 *
 * Usage: node --env-file=.env.local scripts/report-customer-identity-duplicates.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normEmail(email) {
  const t = (email ?? "").trim().toLowerCase();
  return t.length > 0 ? t : null;
}

function normRef(ref) {
  const t = (ref ?? "").trim();
  return t.length > 0 ? t : null;
}

const { data: customers, error: cErr } = await admin
  .from("customers")
  .select("id, organization_id, name, email, phone, created_at");

if (cErr) {
  console.error("customers fetch failed:", cErr.message);
  process.exit(1);
}

const emailGroups = new Map();
for (const c of customers ?? []) {
  const e = normEmail(c.email);
  if (!e) continue;
  const key = `${c.organization_id}\t${e}`;
  const list = emailGroups.get(key) ?? [];
  list.push(c);
  emailGroups.set(key, list);
}

const dupEmails = [...emailGroups.entries()].filter(([, list]) => list.length > 1);

const { data: bookings, error: bErr } = await admin
  .from("bookings")
  .select("id, organization_id, booking_reference, customer_id, created_at");

if (bErr) {
  console.error("bookings fetch failed:", bErr.message);
  process.exit(1);
}

const refGroups = new Map();
for (const b of bookings ?? []) {
  const r = normRef(b.booking_reference);
  if (!r) continue;
  const key = `${b.organization_id}\t${r}`;
  const list = refGroups.get(key) ?? [];
  list.push(b);
  refGroups.set(key, list);
}

const dupRefs = [...refGroups.entries()].filter(([, list]) => list.length > 1);

console.log("=== Customer identity duplicate report (read-only) ===\n");
console.log(`Customers scanned: ${customers?.length ?? 0}`);
console.log(`Bookings scanned: ${bookings?.length ?? 0}`);
console.log(`Duplicate email groups (org + lower(email)): ${dupEmails.length}`);
console.log(
  `Duplicate booking_reference groups (org + ref): ${dupRefs.length}\n`,
);

if (dupEmails.length === 0 && dupRefs.length === 0) {
  console.log("OK: no collisions. Unique indexes can be applied safely.");
  process.exit(0);
}

if (dupEmails.length > 0) {
  console.log("--- Duplicate emails (review before unique index) ---");
  for (const [key, list] of dupEmails) {
    const [, email] = key.split("\t");
    console.log(`\nemail=${email} count=${list.length}`);
    for (const c of list) {
      console.log(
        `  id=${c.id} name=${JSON.stringify(c.name)} created=${c.created_at}`,
      );
    }
  }
  console.log("");
}

if (dupRefs.length > 0) {
  console.log("--- Duplicate booking_reference (review before unique index) ---");
  for (const [key, list] of dupRefs) {
    const [, ref] = key.split("\t");
    console.log(`\nref=${ref} count=${list.length}`);
    for (const b of list) {
      console.log(
        `  id=${b.id} customer_id=${b.customer_id} created=${b.created_at}`,
      );
    }
  }
  console.log("");
}

console.log(
  "No rows were modified. Resolve collisions manually, then re-run this script.",
);
process.exit(1);
