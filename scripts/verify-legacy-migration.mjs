/**
 * Read-only verification: legacy single-tenant data vs new multi-tenant Supabase.
 *
 * Usage:
 *   npm run verify:legacy-migration -- --csv-dir /Users/wahidrahmani/Downloads
 *   npm run verify:legacy-migration -- --csv-dir /path --org-id <uuid>
 *   npm run verify:legacy-migration -- --csv-dir /path --org-slug my-org
 *   npm run verify:legacy-migration -- --source old-db --old-url https://old.supabase.co
 *   npm run verify:legacy-migration -- --source both --csv-dir /path --old-url https://old.supabase.co
 *   npm run verify:legacy-migration -- --json report.json
 *
 * Env (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (new DB)
 *   OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY (optional, old DB)
 *
 * Does not INSERT, UPDATE, DELETE, or UPSERT.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_ADMIN_EMAIL = "admin@eventmanager.no";

const TENANT_TABLES = [
  "properties",
  "customers",
  "bookings",
  "partners",
  "booking_inquiries",
  "accommodation_units",
  "accommodation_reservations",
  "packages",
  "services",
  "assets",
  "transactions",
];

const CSV_FILES = {
  properties: "properties_rows.csv",
  customers: "customers_rows.csv",
  bookings: "bookings_rows.csv",
  partners: "partners_rows.csv",
  booking_inquiries: "booking_inquiries_rows.csv",
  booking_inquiry_activities: "booking_inquiry_activities_rows.csv",
  accommodation_units: "accommodation_units_rows.csv",
  accommodation_reservations: "accommodation_reservations_rows.csv",
  packages: "packages_rows.csv",
  services: "services_rows.csv",
  assets: "assets_rows.csv",
  transactions: "transactions_rows.csv",
};

const COMPARE_FIELDS = {
  properties: ["name", "type"],
  customers: ["name", "email", "phone"],
  bookings: [
    "customer_id",
    "property_id",
    "event_date",
    "status",
    "total_price",
    "paid_amount",
    "remaining_amount",
    "payment_status",
    "payment_due_date",
  ],
  partners: ["name", "category", "email"],
  booking_inquiries: ["customer_id", "property_id", "status", "guest_count"],
  accommodation_units: ["name", "property_id", "max_guests", "active"],
  accommodation_reservations: [
    "unit_id",
    "customer_id",
    "check_in_date",
    "check_out_date",
    "status",
    "total_price",
  ],
  packages: ["name", "price", "active"],
  services: ["name", "price", "active"],
  assets: ["name", "property_id", "quantity", "value"],
  transactions: [
    "property_id",
    "type",
    "category",
    "amount",
    "transaction_date",
  ],
  booking_inquiry_activities: ["inquiry_id", "body", "kind"],
};

const ONBOARDING_EXTRA_HINTS = {
  properties: ["Rønningen Lokale", "ronningen lokale"],
  packages: ["Bryllupspakke", "bryllupspakke"],
};

function parseArgs(argv) {
  const args = {
    csvDir: null,
    source: "csv",
    orgId: null,
    orgSlug: null,
    adminEmail: DEFAULT_ADMIN_EMAIL,
    newUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    newKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
    oldUrl: process.env.OLD_SUPABASE_URL ?? null,
    oldKey: process.env.OLD_SUPABASE_SERVICE_ROLE_KEY ?? null,
    jsonOut: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--csv-dir" && argv[i + 1]) {
      args.csvDir = argv[i + 1];
      i += 1;
    } else if (arg === "--source" && argv[i + 1]) {
      args.source = argv[i + 1];
      i += 1;
    } else if (arg === "--org-id" && argv[i + 1]) {
      args.orgId = argv[i + 1];
      i += 1;
    } else if (arg === "--org-slug" && argv[i + 1]) {
      args.orgSlug = argv[i + 1];
      i += 1;
    } else if (arg === "--admin-email" && argv[i + 1]) {
      args.adminEmail = argv[i + 1];
      i += 1;
    } else if (arg === "--new-url" && argv[i + 1]) {
      args.newUrl = argv[i + 1];
      i += 1;
    } else if (arg === "--new-key" && argv[i + 1]) {
      args.newKey = argv[i + 1];
      i += 1;
    } else if (arg === "--old-url" && argv[i + 1]) {
      args.oldUrl = argv[i + 1];
      i += 1;
    } else if (arg === "--json" && argv[i + 1]) {
      args.jsonOut = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r" && next === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      i += 1;
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = cells[idx] ?? "";
    });
    return record;
  });
}

function readCsvFile(dir, filename) {
  const path = join(dir, filename);
  if (!existsSync(path)) return [];
  return parseCsv(readFileSync(path, "utf8"));
}

function readAssetsCsv(dir) {
  if (existsSync(join(dir, "assets_rows (1).csv"))) {
    return readCsvFile(dir, "assets_rows (1).csv");
  }
  return readCsvFile(dir, "assets_rows.csv");
}

function loadCsvSource(csvDir) {
  const data = {};
  for (const [table, file] of Object.entries(CSV_FILES)) {
    if (table === "assets") {
      data[table] = readAssetsCsv(csvDir);
    } else {
      data[table] = readCsvFile(csvDir, file);
    }
  }
  return data;
}

function normalizeValue(value) {
  if (value == null) return "";
  const s = String(value).trim();
  if (s === "" || s.toLowerCase() === "null") return "";
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? String(n) : s;
  }
  return s;
}

function compareRowFields(oldRow, newRow, fields) {
  const mismatches = [];
  for (const field of fields) {
    const oldVal = normalizeValue(oldRow[field]);
    const newVal = normalizeValue(newRow[field]);
    if (oldVal !== newVal) {
      mismatches.push({ field, old: oldVal, new: newVal });
    }
  }
  return mismatches;
}

async function fetchAllRows(supabase, table, select, filterFn = null) {
  const pageSize = 1000;
  let from = 0;
  const all = [];

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (filterFn) query = filterFn(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table} fetch failed: ${error.message}`);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function loadOldDbSource(supabase) {
  const data = {};
  for (const table of [...TENANT_TABLES, "booking_inquiry_activities"]) {
    const select =
      table === "booking_inquiry_activities"
        ? "*"
        : `id, ${(COMPARE_FIELDS[table] ?? ["id"]).join(", ")}`;
    data[table] = await fetchAllRows(supabase, table, select);
  }
  return data;
}

async function loadNewDbSource(supabase, orgId) {
  const data = {};
  for (const table of TENANT_TABLES) {
    const select = `id, organization_id, ${(COMPARE_FIELDS[table] ?? []).join(", ")}`;
    data[table] = await fetchAllRows(supabase, table, select, (q) =>
      q.eq("organization_id", orgId),
    );
  }
  data.booking_inquiry_activities = await fetchAllRows(
    supabase,
    "booking_inquiry_activities",
    "id, inquiry_id, body, kind",
  );
  return data;
}

async function resolveOrganization(supabase, args) {
  if (args.orgId) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", args.orgId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Organization not found: ${args.orgId}`);
    return { ...data, source: "--org-id" };
  }

  if (args.orgSlug) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", args.orgSlug)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Organization not found for slug: ${args.orgSlug}`);
    return { ...data, source: "--org-slug" };
  }

  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const user = listData.users.find(
    (u) => u.email?.toLowerCase() === args.adminEmail.toLowerCase(),
  );
  if (!user) {
    throw new Error(`User not found: ${args.adminEmail}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  let organizationId = profile?.active_organization_id ?? null;
  let source = "profiles.active_organization_id";

  if (!organizationId) {
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (memberError) throw memberError;
    organizationId = membership?.organization_id ?? null;
    source = "organization_members (first)";
  }

  if (!organizationId) {
    throw new Error(`No organization for ${args.adminEmail}`);
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  if (orgError) throw orgError;
  if (!org) throw new Error(`Organization row missing: ${organizationId}`);

  return { ...org, userId: user.id, source };
}

function indexById(rows) {
  return new Map(rows.map((r) => [r.id, r]));
}

function isOnboardingExtra(table, row) {
  const hints = ONBOARDING_EXTRA_HINTS[table];
  if (!hints || !row?.name) return false;
  const name = String(row.name).toLowerCase();
  return hints.some((h) => name.includes(h.toLowerCase()));
}

function compareTable(table, oldRows, newRows, inquiryIdsInOrg) {
  const oldById = indexById(oldRows);
  const newById = indexById(newRows);
  const oldIds = new Set(oldById.keys());
  const newIds = new Set(newById.keys());

  const missingInNew = [...oldIds].filter((id) => !newIds.has(id));
  const extraInNew = [...newIds].filter((id) => !oldIds.has(id));
  const fieldMismatches = [];

  for (const id of oldIds) {
    if (!newIds.has(id)) continue;
    const mismatches = compareRowFields(
      oldById.get(id),
      newById.get(id),
      COMPARE_FIELDS[table] ?? [],
    );
    if (mismatches.length) {
      fieldMismatches.push({ id, mismatches });
    }
  }

  let activityOrphanIds = [];
  if (table === "booking_inquiry_activities") {
    activityOrphanIds = [...newIds].filter(
      (id) => !inquiryIdsInOrg.has(newById.get(id)?.inquiry_id),
    );
  }

  const onboardingExtras = extraInNew.filter((id) =>
    isOnboardingExtra(table, newById.get(id)),
  );
  const unexplainedExtras = extraInNew.filter(
    (id) => !onboardingExtras.includes(id),
  );

  const fail =
    missingInNew.length > 0 ||
    fieldMismatches.length > 0 ||
    activityOrphanIds.length > 0 ||
    (table !== "booking_inquiry_activities" &&
      table !== "properties" &&
      table !== "packages" &&
      unexplainedExtras.length > 0);

  const warn =
    onboardingExtras.length > 0 ||
    (table === "booking_inquiry_activities" && unexplainedExtras.length > 0) ||
    ((table === "properties" || table === "packages") &&
      unexplainedExtras.length > 0);

  let status = "OK";
  if (fail) status = "FAIL";
  else if (warn) status = "WARN";

  return {
    table,
    oldCount: oldRows.length,
    newCount: newRows.length,
    delta: newRows.length - oldRows.length,
    missingInNew,
    extraInNew,
    onboardingExtras,
    unexplainedExtras,
    fieldMismatches,
    activityOrphanIds,
    status,
  };
}

async function auditOrgAssignment(supabase, orgId, legacyIdsByTable) {
  const misassignedLegacy = {};
  for (const table of TENANT_TABLES) {
    const ids = legacyIdsByTable[table] ?? [];
    if (ids.length === 0) {
      misassignedLegacy[table] = 0;
      continue;
    }
    let misassigned = 0;
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from(table)
        .select("id, organization_id")
        .in("id", chunk);
      if (error) throw error;
      misassigned += (data ?? []).filter(
        (r) => r.organization_id !== orgId,
      ).length;
    }
    misassignedLegacy[table] = misassigned;
  }

  const { data: bookingsCust, error: bcErr } = await supabase
    .from("bookings")
    .select("id, customers!inner(id, organization_id)")
    .eq("organization_id", orgId)
    .neq("customers.organization_id", orgId);
  if (bcErr) throw bcErr;

  const { data: inqCust, error: icErr } = await supabase
    .from("booking_inquiries")
    .select("id, customers!inner(id, organization_id)")
    .eq("organization_id", orgId)
    .neq("customers.organization_id", orgId);
  if (icErr) throw icErr;

  const targetCustomers = await fetchAllRows(
    supabase,
    "customers",
    "id, organization_id",
    (q) => q.eq("organization_id", orgId),
  );
  const targetUnits = await fetchAllRows(
    supabase,
    "accommodation_units",
    "id, organization_id",
    (q) => q.eq("organization_id", orgId),
  );
  const targetReservations = await fetchAllRows(
    supabase,
    "accommodation_reservations",
    "id, customer_id, unit_id",
    (q) => q.eq("organization_id", orgId),
  );
  const customerOrg = new Map(targetCustomers.map((c) => [c.id, c.organization_id]));
  const unitOrg = new Map(targetUnits.map((u) => [u.id, u.organization_id]));

  const resMismatch = targetReservations.filter(
    (r) =>
      customerOrg.get(r.customer_id) !== orgId ||
      unitOrg.get(r.unit_id) !== orgId,
  );

  const targetInquiries = await fetchAllRows(
    supabase,
    "booking_inquiries",
    "id",
    (q) => q.eq("organization_id", orgId),
  );
  const inquiryIdSet = new Set(targetInquiries.map((i) => i.id));
  const targetActivities =
    inquiryIdSet.size === 0
      ? []
      : await fetchAllRows(
          supabase,
          "booking_inquiry_activities",
          "id, inquiry_id",
          (q) => q.in("inquiry_id", [...inquiryIdSet]),
        );
  const badActivities = targetActivities.filter(
    (a) => !inquiryIdSet.has(a.inquiry_id),
  );

  const otherOrgCounts = {};
  for (const table of TENANT_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .neq("organization_id", orgId);
    if (error) throw error;
    otherOrgCounts[table] = count ?? 0;
  }

  const totalMisassigned = Object.values(misassignedLegacy).reduce(
    (a, b) => a + b,
    0,
  );
  const pass =
    totalMisassigned === 0 &&
    (bookingsCust ?? []).length === 0 &&
    (inqCust ?? []).length === 0 &&
    resMismatch.length === 0 &&
    badActivities.length === 0;

  return {
    pass,
    misassignedLegacy,
    bookingCustomerMismatch: (bookingsCust ?? []).map((r) => r.id),
    inquiryCustomerMismatch: (inqCust ?? []).map((r) => r.id),
    reservationMismatch: resMismatch.map((r) => r.id),
    activityInquiryMismatch: badActivities.map((r) => r.id),
    rowsInOtherOrgs: otherOrgCounts,
    totalMisassigned,
  };
}

function referencedCustomerIdsFromBaseline(baseline) {
  const ids = new Set();
  for (const row of baseline.bookings ?? []) {
    if (row.customer_id) ids.add(row.customer_id);
  }
  for (const row of baseline.booking_inquiries ?? []) {
    if (row.customer_id) ids.add(row.customer_id);
  }
  for (const row of baseline.accommodation_reservations ?? []) {
    if (row.customer_id) ids.add(row.customer_id);
  }
  return ids;
}

async function auditFkIntegrity(supabase, orgId, baseline) {
  const bookings = await fetchAllRows(supabase, "bookings", "id, customer_id, property_id", (q) =>
    q.eq("organization_id", orgId),
  );
  const customers = await fetchAllRows(supabase, "customers", "id", (q) =>
    q.eq("organization_id", orgId),
  );
  const properties = await fetchAllRows(supabase, "properties", "id", (q) =>
    q.eq("organization_id", orgId),
  );
  const inquiries = await fetchAllRows(
    supabase,
    "booking_inquiries",
    "id, customer_id, property_id, converted_booking_id",
    (q) => q.eq("organization_id", orgId),
  );
  const reservations = await fetchAllRows(
    supabase,
    "accommodation_reservations",
    "id, customer_id, unit_id",
    (q) => q.eq("organization_id", orgId),
  );
  const units = await fetchAllRows(supabase, "accommodation_units", "id", (q) =>
    q.eq("organization_id", orgId),
  );
  const assets = await fetchAllRows(supabase, "assets", "id, property_id", (q) =>
    q.eq("organization_id", orgId),
  );
  const transactions = await fetchAllRows(
    supabase,
    "transactions",
    "id, property_id",
    (q) => q.eq("organization_id", orgId),
  );

  const customerIds = new Set(customers.map((c) => c.id));
  const propertyIds = new Set(properties.map((p) => p.id));
  const bookingIds = new Set(bookings.map((b) => b.id));
  const unitIds = new Set(units.map((u) => u.id));

  const bookingOrphans = bookings.filter(
    (b) => !customerIds.has(b.customer_id) || (b.property_id && !propertyIds.has(b.property_id)),
  );
  const inquiryOrphans = inquiries.filter(
    (i) =>
      !customerIds.has(i.customer_id) ||
      (i.property_id && !propertyIds.has(i.property_id)) ||
      (i.converted_booking_id && !bookingIds.has(i.converted_booking_id)),
  );
  const reservationOrphans = reservations.filter(
    (r) => !customerIds.has(r.customer_id) || !unitIds.has(r.unit_id),
  );
  const assetOrphans = assets.filter((a) => !propertyIds.has(a.property_id));
  const transactionOrphans = transactions.filter(
    (t) => !propertyIds.has(t.property_id),
  );

  const referencedCustomers = new Set();
  for (const b of bookings) referencedCustomers.add(b.customer_id);
  for (const i of inquiries) referencedCustomers.add(i.customer_id);
  for (const r of reservations) referencedCustomers.add(r.customer_id);

  const unreferencedCustomers = customers
    .map((c) => c.id)
    .filter((id) => !referencedCustomers.has(id));

  const expectedOrphanIds = new Set(
    (baseline.customers ?? [])
      .map((c) => c.id)
      .filter((id) => !referencedCustomerIdsFromBaseline(baseline).has(id)),
  );
  const unexpectedUnreferenced = unreferencedCustomers.filter(
    (id) => !expectedOrphanIds.has(id),
  );

  const pass =
    bookingOrphans.length === 0 &&
    inquiryOrphans.length === 0 &&
    reservationOrphans.length === 0 &&
    assetOrphans.length === 0 &&
    transactionOrphans.length === 0 &&
    unexpectedUnreferenced.length === 0;

  return {
    pass,
    bookingOrphans: bookingOrphans.map((r) => r.id),
    inquiryOrphans: inquiryOrphans.map((r) => r.id),
    reservationOrphans: reservationOrphans.map((r) => r.id),
    assetOrphans: assetOrphans.map((r) => r.id),
    transactionOrphans: transactionOrphans.map((r) => r.id),
    unreferencedCustomers,
    expectedOrphanCustomers: [...expectedOrphanIds],
    unexpectedUnreferenced,
    expectedCustomerCount: baseline?.customers?.length ?? null,
  };
}

function auditPayments(csvBookings, newBookings) {
  const csvById = indexById(csvBookings);
  const newById = indexById(newBookings);
  const issues = [];
  let checked = 0;

  for (const [id, oldRow] of csvById) {
    const newRow = newById.get(id);
    if (!newRow) continue;
    checked += 1;

    const total = Number(newRow.total_price ?? 0);
    const paid = Number(newRow.paid_amount ?? 0);
    const remaining = Number(newRow.remaining_amount ?? 0);
    if (Math.abs(paid + remaining - total) > 0.02) {
      issues.push({
        id,
        type: "sum_mismatch",
        total,
        paid,
        remaining,
      });
    }

    const financialFields = [
      "total_price",
      "paid_amount",
      "remaining_amount",
      "payment_status",
      "payment_due_date",
    ];
    const mismatches = compareRowFields(oldRow, newRow, financialFields);
    if (mismatches.length) {
      issues.push({ id, type: "field_mismatch", mismatches });
    }
  }

  return {
    pass: issues.length === 0,
    checked,
    expected: csvBookings.length,
    issues,
  };
}

async function auditMembership(supabase, org, adminEmail) {
  const { data: members, error: mErr } = await supabase
    .from("organization_members")
    .select("id, user_id, role")
    .eq("organization_id", org.id);
  if (mErr) throw mErr;

  const admins = (members ?? []).filter((m) =>
    ["owner", "admin"].includes(m.role),
  );

  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const adminUser = listData.users.find(
    (u) => u.email?.toLowerCase() === adminEmail.toLowerCase(),
  );

  let profileActiveOrg = null;
  if (adminUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", adminUser.id)
      .maybeSingle();
    profileActiveOrg = profile?.active_organization_id ?? null;
  }

  const { data: subscription, error: sErr } = await supabase
    .from("subscriptions")
    .select("id, status, plan")
    .eq("organization_id", org.id)
    .maybeSingle();
  if (sErr) throw sErr;

  const pass =
    admins.length > 0 &&
    profileActiveOrg === org.id &&
    Boolean(subscription);

  return {
    pass,
    memberCount: members?.length ?? 0,
    adminRoles: admins.map((m) => m.role),
    profileActiveOrg,
    profileMatchesTarget: profileActiveOrg === org.id,
    hasSubscription: Boolean(subscription),
    subscriptionStatus: subscription?.status ?? null,
  };
}

function reconcileSources(csvSource, oldDbSource, sourceMode) {
  if (sourceMode === "csv") return { baseline: csvSource, baselineLabel: "csv" };
  if (sourceMode === "old-db") return { baseline: oldDbSource, baselineLabel: "old-db" };

  const mismatches = [];
  for (const table of [...TENANT_TABLES, "booking_inquiry_activities"]) {
    const csvCount = csvSource[table]?.length ?? 0;
    const dbCount = oldDbSource[table]?.length ?? 0;
    if (csvCount !== dbCount) {
      mismatches.push({ table, csvCount, dbCount });
    }
  }
  if (mismatches.length) {
    throw new Error(
      `CSV vs old-db count mismatch: ${mismatches.map((m) => `${m.table} csv=${m.csvCount} db=${m.dbCount}`).join("; ")}`,
    );
  }
  return { baseline: csvSource, baselineLabel: "csv+old-db" };
}

function printReport(report) {
  const line = "─".repeat(52);
  console.log(`VERIFICATION REPORT — org: ${report.org.slug} (${report.org.id})`);
  console.log(line);
  console.log(
    `${"COUNTS".padEnd(28)} ${"old".padStart(5)} ${"new".padStart(5)}  status`,
  );
  for (const c of report.counts) {
    console.log(
      `${c.table.padEnd(28)} ${String(c.oldCount).padStart(5)} ${String(c.newCount).padStart(5)}  ${c.status}`,
    );
  }
  console.log("");
  console.log(
    `ORG_ASSIGNMENT  ${report.orgAssignment.pass ? "PASS" : "FAIL"} (misassigned legacy rows: ${report.orgAssignment.totalMisassigned})`,
  );
  if (report.orgAssignment.rowsInOtherOrgs) {
    const otherTotal = Object.values(report.orgAssignment.rowsInOtherOrgs).reduce(
      (a, b) => a + b,
      0,
    );
    if (otherTotal > 0) {
      console.log(`  (other tenants: ${otherTotal} rows — informational)`);
    }
  }
  console.log(
    `FK_INTEGRITY    ${report.fkIntegrity.pass ? "PASS" : "FAIL"} (unexpected unreferenced customers: ${report.fkIntegrity.unexpectedUnreferenced.length})`,
  );
  console.log(
    `PAYMENTS        ${report.payments.pass ? "PASS" : "FAIL"} (${report.payments.checked}/${report.payments.expected} consistent)`,
  );
  console.log(
    `MEMBERSHIP      ${report.membership.pass ? "PASS" : "FAIL"} (members: ${report.membership.memberCount}, subscription: ${report.membership.hasSubscription ? "yes" : "no"})`,
  );

  if (report.warnings.length) {
    console.log("WARNINGS");
    for (const w of report.warnings) console.log(`  ${w}`);
  }
  if (report.failures.length) {
    console.log("FAILURES");
    for (const f of report.failures) console.log(`  ${f}`);
  }
  console.log("");
  console.log(`Overall: ${report.pass ? "PASS" : "FAIL"}`);
  console.log(`Baseline: ${report.baselineLabel} | New DB: ${report.newUrl}`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.newUrl || !args.newKey) {
    console.error("Missing new DB credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
  }

  if (args.source === "csv" && !args.csvDir) {
    console.error("Usage: npm run verify:legacy-migration -- --csv-dir /path/to/csvs [--org-slug slug | --org-id uuid]");
    process.exit(1);
  }

  if ((args.source === "old-db" || args.source === "both") && (!args.oldUrl || !args.oldKey)) {
    console.error("Old DB requires OLD_SUPABASE_URL and OLD_SUPABASE_SERVICE_ROLE_KEY (or --old-url).");
    process.exit(1);
  }

  const newSupabase = createClient(args.newUrl, args.newKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const org = await resolveOrganization(newSupabase, args);
  const newSource = await loadNewDbSource(newSupabase, org.id);

  let csvSource = null;
  let oldDbSource = null;

  if (args.csvDir) {
    csvSource = loadCsvSource(args.csvDir);
  }
  if (args.source === "old-db" || args.source === "both") {
    const oldSupabase = createClient(args.oldUrl, args.oldKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    oldDbSource = await loadOldDbSource(oldSupabase);
  }

  const { baseline, baselineLabel } = reconcileSources(
    csvSource ?? oldDbSource,
    oldDbSource ?? csvSource,
    args.source,
  );

  const inquiryIdsInOrg = new Set(
    (newSource.booking_inquiries ?? []).map((r) => r.id),
  );

  const counts = [];
  const warnings = [];
  const failures = [];

  for (const table of [...TENANT_TABLES, "booking_inquiry_activities"]) {
    const oldRows = baseline[table] ?? [];
    const newRows =
      table === "booking_inquiry_activities"
        ? (newSource[table] ?? []).filter((r) =>
            inquiryIdsInOrg.has(r.inquiry_id),
          )
        : (newSource[table] ?? []);

    const result = compareTable(table, oldRows, newRows, inquiryIdsInOrg);
    counts.push(result);

    if (result.onboardingExtras.length) {
      for (const id of result.onboardingExtras) {
        const row = indexById(newRows).get(id);
        warnings.push(`+onboarding ${table}: ${row?.name ?? id}`);
      }
    }
    if (result.unexplainedExtras.length && result.status !== "OK") {
      failures.push(
        `${table}: ${result.unexplainedExtras.length} unexplained extra row(s) in new DB`,
      );
    }
    if (result.missingInNew.length) {
      failures.push(
        `${table}: ${result.missingInNew.length} legacy ID(s) missing in new org`,
      );
    }
    if (result.fieldMismatches.length) {
      failures.push(
        `${table}: ${result.fieldMismatches.length} row(s) with field mismatches`,
      );
    }
    if (result.activityOrphanIds?.length) {
      failures.push(
        `booking_inquiry_activities: ${result.activityOrphanIds.length} orphan activity row(s)`,
      );
    }
    if (
      table === "booking_inquiry_activities" &&
      result.unexplainedExtras.length &&
      result.status === "WARN"
    ) {
      warnings.push(
        `+${result.unexplainedExtras.length} inquiry activit(ies) created in new app (not in CSV)`,
      );
    }
  }

  const legacyIdsByTable = {};
  for (const table of TENANT_TABLES) {
    legacyIdsByTable[table] = (baseline[table] ?? []).map((r) => r.id);
  }
  legacyIdsByTable.booking_inquiry_activities = (
    baseline.booking_inquiry_activities ?? []
  ).map((r) => r.id);

  const orgAssignment = await auditOrgAssignment(
    newSupabase,
    org.id,
    legacyIdsByTable,
  );
  if (!orgAssignment.pass) {
    failures.push("Organization assignment audit failed");
  }

  const fkIntegrity = await auditFkIntegrity(newSupabase, org.id, baseline);
  if (!fkIntegrity.pass) {
    failures.push("FK integrity audit failed");
  }
  if (fkIntegrity.expectedOrphanCustomers.length > 0) {
    warnings.push(
      `${fkIntegrity.expectedOrphanCustomers.length} orphan customer(s) in CSV (no booking/inquiry/accommodation FK) — expected after --customers-all`,
    );
  }

  const payments = auditPayments(
    baseline.bookings ?? [],
    newSource.bookings ?? [],
  );
  if (!payments.pass) {
    failures.push(`Payment audit: ${payments.issues.length} booking issue(s)`);
  }

  const membership = await auditMembership(newSupabase, org, args.adminEmail);
  if (!membership.pass) {
    failures.push("Membership / subscription audit failed");
  }

  const countFail = counts.some((c) => c.status === "FAIL");
  const pass =
    !countFail &&
    orgAssignment.pass &&
    fkIntegrity.pass &&
    payments.pass &&
    membership.pass;

  const report = {
    pass,
    generatedAt: new Date().toISOString(),
    baselineLabel,
    newUrl: args.newUrl,
    org: { id: org.id, name: org.name, slug: org.slug, resolvedVia: org.source },
    counts,
    orgAssignment,
    fkIntegrity,
    payments,
    membership,
    warnings,
    failures,
  };

  printReport(report);

  if (args.jsonOut) {
    writeFileSync(args.jsonOut, JSON.stringify(report, null, 2));
    console.log(`JSON report written to ${args.jsonOut}`);
  }

  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
