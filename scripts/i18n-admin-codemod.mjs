import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const adminSrc = readFileSync("src/i18n/dictionaries/parts/admin.ts", "utf8");
const nbMatch = adminSrc.match(/export const adminNb = (\{[\s\S]*?\}) as const;/);
if (!nbMatch) throw new Error("adminNb not found");
const adminNb = JSON.parse(nbMatch[1]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if ([".tsx", ".ts"].includes(extname(p))) files.push(p);
  }
  return files;
}

const targets = [
  ...walk("src/components/admin"),
  ...walk("src/app/admin"),
].filter((f) => !f.endsWith(".css"));

const entries = Object.entries(adminNb).sort(([, a], [, b]) => b.length - a.length);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addUseTranslation(content, isPageTsx) {
  if (content.includes("useTranslation") || content.includes("getServerTranslation")) {
    return content;
  }

  if (isPageTsx) {
    if (!content.includes("getServerTranslation")) {
      const importLine = `import { getServerTranslation } from "@/i18n/server";\n`;
      content = importLine + content;
    }
    content = content.replace(
      /export default async function (\w+)/,
      `export default async function $1`,
    );
    content = content.replace(
      /(export default async function \w+[^{]*\{)\n/,
      `$1\n  const { t } = await getServerTranslation();\n`,
    );
    return content;
  }

  const hasUseClient =
    content.includes('"use client"') || content.includes("'use client'");
  if (!hasUseClient) {
    content = `"use client";\n\n${content}`;
  }

  if (!content.includes("@/i18n/client")) {
    const insertAt = content.startsWith('"use client"')
      ? content.indexOf("\n", content.indexOf('"use client"')) + 1
      : 0;
    content =
      content.slice(0, insertAt) +
      `import { useTranslation } from "@/i18n/client";\n` +
      content.slice(insertAt);
  }

  const fnPatterns = [
    /export function (\w+)/g,
    /export default function (\w+)/g,
  ];
  for (const re of fnPatterns) {
    content = content.replace(re, (match, name) => {
      const fnStart = content.indexOf(match);
      const brace = content.indexOf("{", fnStart);
      const afterBrace = content.slice(brace + 1, brace + 80);
      if (afterBrace.includes("useTranslation()")) return match;
      return match;
    });
  }

  // Add hook to first exported function component
  content = content.replace(
    /(export (?:default )?function \w+[^{]*\{)\n(?!\s*const \{ t \})/,
    `$1\n  const { t } = useTranslation();\n`,
  );

  return content;
}

let total = 0;

for (const file of targets) {
  let content = readFileSync(file, "utf8");
  const original = content;
  let fileReplacements = 0;

  for (const [key, nb] of entries) {
    const esc = escapeRe(nb);
    const tCall = `t("admin.${key}")`;

    const replacements = [
      // JSX attribute: title="..."
      [new RegExp(`(\\w+)=("${esc}")`, "g"), `$1={${tCall}}`],
      [new RegExp(`(\\w+)=('${esc}')`, "g"), `$1={${tCall}}`],
      // aria-label="..."
      [new RegExp(`(aria-\\w+)=("${esc}")`, "g"), `$1={${tCall}}`],
      // Object property: label: "..."
      [new RegExp(`(\\w+): ("${esc}")`, "g"), `$1: ${tCall}`],
      [new RegExp(`(\\w+): ('${esc}')`, "g"), `$1: ${tCall}`],
      // JSX children: >text<
      [new RegExp(`>\\s*${esc}\\s*<`, "g"), `>{${tCall}}<`],
      // Standalone string in return/array
      [new RegExp(`"${esc}"`, "g"), `{${tCall}}`],
      [new RegExp(`'${esc}'`, "g"), `{${tCall}}`],
    ];

    for (const [re, repl] of replacements) {
      const next = content.replace(re, repl);
      if (next !== content) {
        const count = (content.match(re) ?? []).length;
        fileReplacements += count;
        content = next;
      }
    }
  }

  if (content === original) continue;

  const isPage = file.endsWith("/app/admin/page.tsx");
  content = addUseTranslation(content, isPage);

  writeFileSync(file, content);
  total += fileReplacements;
  console.log(`${file}: ${fileReplacements}`);
}

console.log(`Total replacements: ${total}`);
