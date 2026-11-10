#!/usr/bin/env node
/**
 * Scans src/ for likely hardcoded Norwegian UI strings in TSX/TS files.
 * Excludes dictionaries, tests, migrations, and intentional exceptions.
 *
 * Usage:
 *   node scripts/i18n-audit.mjs
 *   node scripts/i18n-audit.mjs --path src/components/admin
 *   node scripts/i18n-audit.mjs --path src/app/admin
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");

const NORWEGIAN_CHARS = /[æøåÆØÅ]/;

const NORWEGIAN_UI_WORD_LIST = [
  "Ingen",
  "Lagre",
  "Opprett",
  "Registrert",
  "Organisasjon",
  "Organisasjoner",
  "Emne",
  "Begrunnelse",
  "Notater",
  "Abonnement",
  "Abonnementer",
  "Velg",
  "Lukk",
  "Laster",
  "Gå til",
  "Juridisk",
  "Kontakt",
  "Faktura",
  "Koblet",
  "Valgfri",
  "Farlig",
  "Planfordeling",
  "Varsler",
  "Forespørsel",
  "Bekreft",
  "Slett",
  "Avbryt",
  "Innstillinger",
  "Prøve",
  "Suspender",
  "Medlemmer",
  "Medlem",
  "Leveringer",
  "Kampanje",
  "Miljø",
  "Bakgrunnsjobber",
  "Fullfør",
  "Ja",
  "Nei",
  "Før:",
  "Etter:",
  "Sist",
  "Periode",
  "Stripe",
  "Interne",
  "Planlagt",
  "Global",
  "Alle",
  "Se alle",
  "Åpne",
  "Avslutt",
  "Du ser",
  "Utvid",
  "Kopier",
  "Antall",
  "Synkronisert",
  "Avsluttes",
  "aktiv",
  "Styrer",
];

const NORWEGIAN_UI_WORDS = new RegExp(
  `\\b(${NORWEGIAN_UI_WORD_LIST.join("|")})\\b`,
);

const EXCLUDE_DIRS = new Set(["i18n", "types", "node_modules"]);

const EXCLUDE_FILES = [
  /database\.types\.ts$/,
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
];

const EXCLUDE_PATH_PREFIXES = ["src/i18n/dictionaries/"];

const ALLOWLIST_PATHS = new Set([
  "src/lib/validations.ts",
  "src/config/routes.ts",
  "src/lib/settings/settings-links.ts",
  "src/config/admin-routes.ts",
]);

function buildStringPatterns() {
  const wordAlt = NORWEGIAN_UI_WORD_LIST.join("|");
  return [
    /"([^"\\]*[æøåÆØÅ][^"\\]*)"/g,
    /'([^'\\]*[æøåÆØÅ][^'\\]*)'/g,
    /`([^`\\]*[æøåÆØÅ][^`\\]*)`/g,
    new RegExp(`"([^"\\\\]*\\b(?:${wordAlt})\\b[^"\\\\]*)"`,"g"),
    new RegExp(`'([^'\\\\]*\\b(?:${wordAlt})\\b[^'\\\\]*)'`,"g"),
    new RegExp(`\`([^\`\\\\]*\\b(?:${wordAlt})\\b[^\`\\\\]*)\``,"g"),
  ];
}

const STRING_PATTERNS = buildStringPatterns();

function parseArgs() {
  const args = process.argv.slice(2);
  const pathIdx = args.indexOf("--path");
  if (pathIdx === -1) return { scanRoot: SRC, label: "src" };
  const scanPath = args[pathIdx + 1];
  if (!scanPath) {
    console.error("i18n audit: --path requires a directory (e.g. src/components/admin)");
    process.exit(2);
  }
  const resolved = path.isAbsolute(scanPath)
    ? scanPath
    : path.join(ROOT, scanPath);
  return { scanRoot: resolved, label: scanPath.replace(/\\/g, "/") };
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      files.push(...(await walk(full)));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function isExcluded(file) {
  const r = rel(file);
  if (ALLOWLIST_PATHS.has(r)) return true;
  if (EXCLUDE_PATH_PREFIXES.some((p) => r.startsWith(p))) return true;
  return EXCLUDE_FILES.some((re) => re.test(r));
}

function scanContent(content) {
  const hits = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }

    // Skip translation key references (not user-visible copy).
    if (/\bt\s*\(\s*["'`]/.test(line)) continue;

    if (!NORWEGIAN_CHARS.test(line) && !NORWEGIAN_UI_WORDS.test(line)) continue;

    for (const pattern of STRING_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const text = match[1];
        if (text.length < 2) continue;
        hits.push({ line: i + 1, text, raw: line.trim() });
      }
    }
  }

  return hits;
}

async function main() {
  const { scanRoot, label } = parseArgs();
  const files = await walk(scanRoot);
  const findings = [];

  for (const file of files) {
    if (isExcluded(file)) continue;
    const content = await readFile(file, "utf8");
    const hits = scanContent(content);
    if (hits.length > 0) {
      findings.push({ file: rel(file), hits });
    }
  }

  if (findings.length === 0) {
    console.log(`i18n audit (${label}): no hardcoded Norwegian UI strings detected.`);
    process.exit(0);
  }

  console.log(
    `i18n audit (${label}): ${findings.length} file(s) with likely hardcoded Norwegian UI strings:\n`,
  );
  for (const { file, hits } of findings) {
    console.log(file);
    for (const hit of hits) {
      console.log(`  L${hit.line}: "${hit.text}"`);
      console.log(`    ${hit.raw}`);
    }
    console.log();
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
