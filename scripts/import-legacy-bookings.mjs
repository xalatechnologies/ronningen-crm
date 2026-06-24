/**
 * Additive import of legacy bookings from CSV exports (old Rønningen DB).
 *
 * Imports: property + customers + bookings (FK chain), partners when
 * partners_rows.csv is present, and forespørsler when booking_inquiries_rows.csv
 * is present. Does not UPDATE or DELETE existing rows.
 *
 * Usage:
 *   npm run import:legacy-bookings -- --csv-dir /Users/wahidrahmani/Downloads
 *   npm run import:legacy-bookings -- --csv-dir /Users/wahidrahmani/Downloads --execute
 *   npm run import:legacy-bookings -- --csv-dir /Users/wahidrahmani/Downloads --partners-only --execute
 *   npm run import:legacy-bookings -- --csv-dir /Users/wahidrahmani/Downloads --inquiries-only --execute
 *   npm run import:legacy-bookings -- --csv-dir /Users/wahidrahmani/Downloads --remaining --execute
 *   npm run import:legacy-bookings -- --csv-dir /Users/wahidrahmani/Downloads --customers-all --execute
 *
 * Requires in .env.local (new eventmanager Supabase project):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PLATFORM_ADMIN_EMAIL = "admin@eventmanager.no";

const PROPERTY_DEFAULTS = {
  "d77fcb7a-826f-4af9-81d1-5d45278f7862": {
    name: "Rønningen selskaplokalet",
    type: "selskaplokale",
  },
  "1363897f-62d9-47e3-82a6-51ead4e3c431": {
    name: "Rønningen gård",
    type: "gård",
  },
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseArgs(argv) {
  const args = { csvDir: null, execute: false, mode: "all", customersAll: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--execute") {
      args.execute = true;
    } else if (arg === "--partners-only") {
      args.mode = "partners";
    } else if (arg === "--inquiries-only") {
      args.mode = "inquiries";
    } else if (arg === "--remaining") {
      args.mode = "remaining";
    } else if (arg === "--overnatting-only") {
      args.mode = "overnatting";
    } else if (arg === "--pricing-only") {
      args.mode = "pricing";
    } else if (arg === "--assets-only") {
      args.mode = "assets";
    } else if (arg === "--finance-only") {
      args.mode = "finance";
    } else if (arg === "--customers-all") {
      args.customersAll = true;
      if (args.mode === "all") {
        args.mode = "customers";
      }
    } else if (arg === "--csv-dir" && argv[i + 1]) {
      args.csvDir = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

/** RFC 4180-style CSV parser (handles quoted multiline fields). */
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
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
      i += 1;
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
    }
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
  const text = readFileSync(path, "utf8");
  return parseCsv(text);
}

function readCsvFileOptional(dir, filename) {
  const path = join(dir, filename);
  if (!existsSync(path)) return [];
  return readCsvFile(dir, filename);
}

function nullIfEmpty(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntField(value, fallback = 0) {
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(value, fallback = true) {
  if (value == null || String(value).trim() === "") return fallback;
  const v = String(value).trim().toLowerCase();
  if (v === "true" || v === "t" || v === "1") return true;
  if (v === "false" || v === "f" || v === "0") return false;
  return fallback;
}

function readAssetsCsv(dir) {
  if (existsSync(join(dir, "assets_rows (1).csv"))) {
    return readCsvFile(dir, "assets_rows (1).csv");
  }
  return readCsvFileOptional(dir, "assets_rows.csv");
}

async function resolveOrganizationId(supabase) {
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const user = listData.users.find(
    (u) => u.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL,
  );
  if (!user) {
    throw new Error(
      `${PLATFORM_ADMIN_EMAIL} not found. Run npm run admin:seed first.`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  if (profile?.active_organization_id) {
    return {
      organizationId: profile.active_organization_id,
      userId: user.id,
      source: "profiles.active_organization_id",
    };
  }

  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (memberError) throw memberError;

  if (!membership?.organization_id) {
    throw new Error(
      `No organization for ${PLATFORM_ADMIN_EMAIL}. Sign in and complete onboarding first.`,
    );
  }

  return {
    organizationId: membership.organization_id,
    userId: user.id,
    source: "organization_members (first)",
  };
}

async function fetchExistingIds(supabase, table, ids) {
  if (ids.length === 0) return new Set();
  const existing = new Set();
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .in("id", chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      existing.add(row.id);
    }
  }
  return existing;
}

async function insertIgnore(supabase, table, rows) {
  if (rows.length === 0) {
    return { attempted: 0, error: null };
  }
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  return { attempted: rows.length, error };
}

function buildPropertyRows(propertyIds, organizationId, propertyRecordsById = new Map()) {
  return [...propertyIds].map((id) => {
    const fromCsv = propertyRecordsById.get(id);
    if (fromCsv) {
      return {
        id: fromCsv.id,
        name: fromCsv.name,
        address: nullIfEmpty(fromCsv.address),
        type: nullIfEmpty(fromCsv.type),
        notes: nullIfEmpty(fromCsv.notes),
        organization_id: organizationId,
        created_at: nullIfEmpty(fromCsv.created_at) ?? undefined,
        updated_at: nullIfEmpty(fromCsv.updated_at) ?? undefined,
      };
    }
    const defaults = PROPERTY_DEFAULTS[id] ?? {
      name: "Imported lokale",
      type: "selskaplokale",
    };
    return {
      id,
      name: defaults.name,
      type: defaults.type,
      organization_id: organizationId,
    };
  });
}

function buildCustomerRows(customerRecords, organizationId) {
  return customerRecords.map((row) => ({
    id: row.id,
    name: row.name,
    phone: nullIfEmpty(row.phone),
    email: nullIfEmpty(row.email),
    notes: nullIfEmpty(row.notes),
    address: nullIfEmpty(row.address),
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

function buildBookingRows(bookingRecords, organizationId) {
  return bookingRecords.map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    property_id: nullIfEmpty(row.property_id),
    event_type: row.event_type,
    fest_type: nullIfEmpty(row.fest_type),
    event_date: row.event_date,
    event_end_date: nullIfEmpty(row.event_end_date),
    event_start_time: nullIfEmpty(row.event_start_time),
    event_end_time: nullIfEmpty(row.event_end_time),
    guest_count: parseIntField(row.guest_count, 0),
    status: row.status,
    total_price: parseNumber(row.total_price, 0),
    paid_amount: parseNumber(row.paid_amount, 0),
    remaining_amount: parseNumber(row.remaining_amount, 0),
    notes: nullIfEmpty(row.notes),
    booking_reference: nullIfEmpty(row.booking_reference),
    payment_due_date: nullIfEmpty(row.payment_due_date),
    collection_notice_sent_at: nullIfEmpty(row.collection_notice_sent_at),
    payment_status: nullIfEmpty(row.payment_status),
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

function buildPartnerRows(partnerRecords, organizationId) {
  return partnerRecords.map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    phone: nullIfEmpty(row.phone),
    email: nullIfEmpty(row.email),
    notes: nullIfEmpty(row.notes),
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

function buildInquiryRows(inquiryRecords, organizationId) {
  return inquiryRecords.map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    property_id: nullIfEmpty(row.property_id),
    event_type: row.event_type || "Privat",
    fest_type: nullIfEmpty(row.fest_type),
    preferred_event_date: nullIfEmpty(row.preferred_event_date),
    preferred_event_end_date: nullIfEmpty(row.preferred_event_end_date),
    guest_count: parseIntField(row.guest_count, 0),
    estimated_total:
      nullIfEmpty(row.estimated_total) == null
        ? null
        : parseNumber(row.estimated_total, 0),
    status: row.status || "new",
    next_follow_up_at: nullIfEmpty(row.next_follow_up_at),
    internal_notes: nullIfEmpty(row.internal_notes),
    converted_booking_id: nullIfEmpty(row.converted_booking_id),
    converted_at: nullIfEmpty(row.converted_at),
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

function buildInquiryActivityRows(activityRecords) {
  return activityRecords.map((row) => ({
    id: row.id,
    inquiry_id: row.inquiry_id,
    body: row.body,
    kind: row.kind || "note",
    created_at: nullIfEmpty(row.created_at) ?? undefined,
  }));
}

function buildAccommodationUnitRows(unitRecords, organizationId) {
  return unitRecords.map((row) => ({
    id: row.id,
    name: row.name,
    property_id: nullIfEmpty(row.property_id),
    max_guests: parseIntField(row.max_guests, 4),
    notes: nullIfEmpty(row.notes),
    active: parseBool(row.active, true),
    sort_order: parseIntField(row.sort_order, 0),
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

function buildAccommodationReservationRows(reservationRecords, organizationId) {
  return reservationRecords.map((row) => ({
    id: row.id,
    unit_id: row.unit_id,
    customer_id: row.customer_id,
    check_in_date: row.check_in_date,
    check_out_date: row.check_out_date,
    check_in_time: nullIfEmpty(row.check_in_time),
    check_out_time: nullIfEmpty(row.check_out_time),
    status: row.status || "confirmed",
    guest_count: parseIntField(row.guest_count, 1),
    notes: nullIfEmpty(row.notes),
    total_price:
      nullIfEmpty(row.total_price) == null
        ? null
        : parseNumber(row.total_price, 0),
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

function buildPackageRows(packageRecords, organizationId) {
  return packageRecords.map((row) => ({
    id: row.id,
    name: row.name,
    description: nullIfEmpty(row.description),
    price: parseNumber(row.price, 0),
    active: parseBool(row.active, true),
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

function buildServiceRows(serviceRecords, organizationId) {
  return serviceRecords.map((row) => ({
    id: row.id,
    name: row.name,
    description: nullIfEmpty(row.description),
    price: parseNumber(row.price, 0),
    active: parseBool(row.active, true),
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

function buildAssetRows(assetRecords, organizationId) {
  return assetRecords.map((row) => ({
    id: row.id,
    property_id: row.property_id,
    name: row.name,
    quantity: parseIntField(row.quantity, 0),
    value: parseNumber(row.value, 0),
    condition: nullIfEmpty(row.condition),
    insurance_status: nullIfEmpty(row.insurance_status),
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

function buildTransactionRows(transactionRecords, organizationId) {
  return transactionRecords.map((row) => ({
    id: row.id,
    property_id: row.property_id,
    type: row.type,
    category: row.category,
    description: nullIfEmpty(row.description),
    amount: parseNumber(row.amount, 0),
    transaction_date: row.transaction_date,
    organization_id: organizationId,
    created_at: nullIfEmpty(row.created_at) ?? undefined,
    updated_at: nullIfEmpty(row.updated_at) ?? undefined,
  }));
}

const MODE_LABELS = {
  all: "",
  partners: " (partners only)",
  inquiries: " (forespørsler only)",
  remaining: " (remaining tables)",
  overnatting: " (overnatting only)",
  pricing: " (priser only)",
  assets: " (inventar only)",
  finance: " (finans only)",
  customers: " (all customers)",
};

const INSERT_ORDER = [
  "properties",
  "customers",
  "bookings",
  "partners",
  "booking_inquiries",
  "booking_inquiry_activities",
  "accommodation_units",
  "accommodation_reservations",
  "packages",
  "services",
  "assets",
  "transactions",
];

async function countForOrg(supabase, table, organizationId) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (error) throw error;
  return count ?? 0;
}

async function printVerification(supabase, organizationId, mode) {
  const tables = [
    "customers",
    "bookings",
    "booking_inquiries",
    "partners",
    "accommodation_units",
    "accommodation_reservations",
    "packages",
    "services",
    "assets",
    "transactions",
  ];
  console.log("");
  console.log("Verification (rows for organization):");
  for (const table of tables) {
    if (mode === "customers" && table !== "customers") {
      continue;
    }
    const count = await countForOrg(supabase, table, organizationId);
    console.log(`  ${table.padEnd(28)} ${count}`);
  }
  console.log("");
  console.log("Sign in as admin@eventmanager.no and check the app.");
}

function planLine(name, rows, existing) {
  const toInsert = rows.filter((r) => !existing.has(r.id));
  return { name, toInsert, skip: existing.size };
}

function loadCustomersById(csvDir) {
  const customersRaw = readCsvFileOptional(csvDir, "customers_rows.csv");
  return new Map(customersRaw.map((row) => [row.id, row]));
}

function resolveCustomerRecords(customerIds, customersById) {
  const missing = customerIds.filter((id) => !customersById.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.length} customer id(s) in customers_rows.csv: ${missing.slice(0, 3).join(", ")}`,
    );
  }
  return customerIds.map((id) => customersById.get(id));
}

async function main() {
  const { csvDir, execute, mode, customersAll } = parseArgs(process.argv);

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  if (!csvDir) {
    console.error(
      "Usage: npm run import:legacy-bookings -- --csv-dir /path/to/csvs [--execute] [--remaining | --overnatting-only | --pricing-only | --assets-only | --finance-only | --customers-all | --partners-only | --inquiries-only]",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { organizationId, source } = await resolveOrganizationId(supabase);
  const customersById = loadCustomersById(csvDir);
  const propertiesRaw = readCsvFileOptional(csvDir, "properties_rows.csv");
  const propertyRecordsById = new Map(
    propertiesRaw.map((row) => [row.id, row]),
  );

  const importBookings = mode === "all";
  const importPartners = mode === "all" || mode === "partners";
  const importInquiries = mode === "all" || mode === "inquiries";
  const importOvernatting =
    mode === "remaining" || mode === "overnatting";
  const importPricing = mode === "remaining" || mode === "pricing";
  const importAssets = mode === "remaining" || mode === "assets";
  const importFinance = mode === "remaining" || mode === "finance";
  const importCustomersOnly = mode === "customers";

  const partnersRaw = importPartners
    ? readCsvFileOptional(csvDir, "partners_rows.csv")
    : [];
  const inquiriesRaw = importInquiries
    ? readCsvFileOptional(csvDir, "booking_inquiries_rows.csv")
    : [];
  const activitiesRaw = importInquiries
    ? readCsvFileOptional(csvDir, "booking_inquiry_activities_rows.csv")
    : [];
  const unitsRaw = importOvernatting
    ? readCsvFileOptional(csvDir, "accommodation_units_rows.csv")
    : [];
  const reservationsRaw = importOvernatting
    ? readCsvFileOptional(csvDir, "accommodation_reservations_rows.csv")
    : [];
  const packagesRaw = importPricing
    ? readCsvFileOptional(csvDir, "packages_rows.csv")
    : [];
  const servicesRaw = importPricing
    ? readCsvFileOptional(csvDir, "services_rows.csv")
    : [];
  const assetsRaw = importAssets ? readAssetsCsv(csvDir) : [];
  const transactionsRaw = importFinance
    ? readCsvFileOptional(csvDir, "transactions_rows.csv")
    : [];

  if (importInquiries && inquiriesRaw.length === 0) {
    throw new Error(
      "booking_inquiries_rows.csv not found. Export forespørsler from the old Supabase Table Editor.",
    );
  }

  const propertyIdSet = new Set();
  const customerIdSet = new Set();

  let bookingRows = [];
  if (importBookings) {
    const bookingsRaw = readCsvFile(csvDir, "bookings_rows.csv");
    for (const row of bookingsRaw) {
      if (row.property_id) propertyIdSet.add(row.property_id);
      if (row.customer_id) customerIdSet.add(row.customer_id);
    }
    bookingRows = buildBookingRows(bookingsRaw, organizationId);
  }

  if (importInquiries) {
    for (const row of inquiriesRaw) {
      if (row.property_id) propertyIdSet.add(row.property_id);
      if (row.customer_id) customerIdSet.add(row.customer_id);
    }
  }

  if (importOvernatting) {
    for (const row of unitsRaw) {
      if (row.property_id) propertyIdSet.add(row.property_id);
    }
    for (const row of reservationsRaw) {
      if (row.customer_id) customerIdSet.add(row.customer_id);
    }
  }

  if (importAssets) {
    for (const row of assetsRaw) {
      if (row.property_id) propertyIdSet.add(row.property_id);
    }
  }

  if (importFinance) {
    for (const row of transactionsRaw) {
      if (row.property_id) propertyIdSet.add(row.property_id);
    }
  }

  if (customersAll || importCustomersOnly) {
    for (const id of customersById.keys()) {
      customerIdSet.add(id);
    }
  }

  const propertyRows = buildPropertyRows(
    propertyIdSet,
    organizationId,
    propertyRecordsById,
  );
  const customerRows = buildCustomerRows(
    resolveCustomerRecords([...customerIdSet], customersById),
    organizationId,
  );
  const partnerRows = buildPartnerRows(partnersRaw, organizationId);
  const inquiryRows = buildInquiryRows(inquiriesRaw, organizationId);
  const activityRows = buildInquiryActivityRows(activitiesRaw);
  const unitRows = buildAccommodationUnitRows(unitsRaw, organizationId);
  const reservationRows = buildAccommodationReservationRows(
    reservationsRaw,
    organizationId,
  );
  const packageRows = buildPackageRows(packagesRaw, organizationId);
  const serviceRows = buildServiceRows(servicesRaw, organizationId);
  const assetRows = buildAssetRows(assetsRaw, organizationId);
  const transactionRows = buildTransactionRows(
    transactionsRaw,
    organizationId,
  );

  const [
    existingProperties,
    existingCustomers,
    existingBookings,
    existingPartners,
    existingInquiries,
    existingActivities,
    existingUnits,
    existingReservations,
    existingPackages,
    existingServices,
    existingAssets,
    existingTransactions,
  ] = await Promise.all([
    fetchExistingIds(
      supabase,
      "properties",
      propertyRows.map((r) => r.id),
    ),
    fetchExistingIds(
      supabase,
      "customers",
      customerRows.map((r) => r.id),
    ),
    importBookings
      ? fetchExistingIds(
          supabase,
          "bookings",
          bookingRows.map((r) => r.id),
        )
      : Promise.resolve(new Set()),
    fetchExistingIds(
      supabase,
      "partners",
      partnerRows.map((r) => r.id),
    ),
    fetchExistingIds(
      supabase,
      "booking_inquiries",
      inquiryRows.map((r) => r.id),
    ),
    fetchExistingIds(
      supabase,
      "booking_inquiry_activities",
      activityRows.map((r) => r.id),
    ),
    importOvernatting
      ? fetchExistingIds(
          supabase,
          "accommodation_units",
          unitRows.map((r) => r.id),
        )
      : Promise.resolve(new Set()),
    importOvernatting
      ? fetchExistingIds(
          supabase,
          "accommodation_reservations",
          reservationRows.map((r) => r.id),
        )
      : Promise.resolve(new Set()),
    importPricing
      ? fetchExistingIds(
          supabase,
          "packages",
          packageRows.map((r) => r.id),
        )
      : Promise.resolve(new Set()),
    importPricing
      ? fetchExistingIds(
          supabase,
          "services",
          serviceRows.map((r) => r.id),
        )
      : Promise.resolve(new Set()),
    importAssets
      ? fetchExistingIds(
          supabase,
          "assets",
          assetRows.map((r) => r.id),
        )
      : Promise.resolve(new Set()),
    importFinance
      ? fetchExistingIds(
          supabase,
          "transactions",
          transactionRows.map((r) => r.id),
        )
      : Promise.resolve(new Set()),
  ]);

  const plans = [];
  if (propertyRows.length > 0) {
    plans.push(planLine("properties", propertyRows, existingProperties));
  }
  if (customerRows.length > 0) {
    plans.push(planLine("customers", customerRows, existingCustomers));
  }
  if (importBookings) {
    plans.push(planLine("bookings", bookingRows, existingBookings));
  }
  if (importPartners && partnersRaw.length > 0) {
    plans.push(planLine("partners", partnerRows, existingPartners));
  } else if (importPartners) {
    plans.push({ name: "partners", toInsert: [], skip: 0, missing: true });
  }
  if (importInquiries) {
    plans.push(planLine("booking_inquiries", inquiryRows, existingInquiries));
    plans.push(
      planLine(
        "booking_inquiry_activities",
        activityRows,
        existingActivities,
      ),
    );
  }
  if (importOvernatting) {
    plans.push(planLine("accommodation_units", unitRows, existingUnits));
    plans.push(
      planLine(
        "accommodation_reservations",
        reservationRows,
        existingReservations,
      ),
    );
  }
  if (importPricing) {
    plans.push(planLine("packages", packageRows, existingPackages));
    plans.push(planLine("services", serviceRows, existingServices));
  }
  if (importAssets) {
    plans.push(planLine("assets", assetRows, existingAssets));
  }
  if (importFinance) {
    plans.push(planLine("transactions", transactionRows, existingTransactions));
  }

  const modeLabel = MODE_LABELS[mode] ?? "";

  console.log(`Supabase: ${url}`);
  console.log(`Organization: ${organizationId} (${source})`);
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY-RUN"}${modeLabel}`);
  console.log("");
  console.log("Import plan (additive only, ON CONFLICT DO NOTHING):");
  for (const plan of plans) {
    if (plan.missing) {
      console.log("  partners:   (partners_rows.csv not found — skipped)");
      continue;
    }
    console.log(
      `  ${plan.name.padEnd(28)} ${plan.toInsert.length} insert, ${plan.skip} skip`,
    );
  }

  if (!execute) {
    console.log("");
    console.log("Dry-run complete. Re-run with --execute to apply.");
    return;
  }

  const rowsByTable = Object.fromEntries(
    plans.map((plan) => [plan.name, plan.toInsert]),
  );

  for (const table of INSERT_ORDER) {
    const rows = rowsByTable[table];
    if (!rows?.length) continue;
    const { attempted, error } = await insertIgnore(supabase, table, rows);
    if (error) {
      throw new Error(`${table} insert failed: ${error.message}`);
    }
    console.log(`Inserted up to ${attempted} row(s) into ${table}.`);
  }

  await printVerification(supabase, organizationId, mode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
