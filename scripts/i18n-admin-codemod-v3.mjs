import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const adminSrc = readFileSync("src/i18n/dictionaries/parts/admin.ts", "utf8");
const nbMatch = adminSrc.match(/export const adminNb = (\{[\s\S]*?\}) as const;/);
if (!nbMatch) throw new Error("adminNb not found");
const adminNb = JSON.parse(nbMatch[1]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (p.endsWith(".tsx")) files.push(p);
  }
  return files;
}

const targets = [...walk("src/components/admin"), ...walk("src/app/admin")];
const entries = Object.entries(adminNb).sort(([, a], [, b]) => b.length - a.length);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shouldSkipLine(line) {
  const t = line.trim();
  if (t.startsWith("import ") || t.startsWith("//")) return true;
  if (t.includes("as const")) return true;
  if (/^(export )?const \w+.*=\s*\[/.test(t) && t.includes("label:")) return true;
  return false;
}

function addHooks(content, file) {
  if (content.includes("useTranslation") || content.includes("getServerTranslation")) {
    return content;
  }
  const isServerPage = file.endsWith("/app/admin/page.tsx");
  if (isServerPage) {
    if (!content.includes("getServerTranslation")) {
      content = `import { getServerTranslation } from "@/i18n/server";\n${content}`;
    }
    content = content.replace(
      /(export default async function \w+[^{]*\{)\n/,
      `$1\n  const { t } = await getServerTranslation();\n`,
    );
    return content;
  }
  if (!content.includes('"use client"')) {
    content = `"use client";\n\n${content}`;
  }
  if (!content.includes("@/i18n/client")) {
    content = content.replace(
      /^("use client";\n\n)?/,
      `$1import { useTranslation } from "@/i18n/client";\n`,
    );
  }
  const fnPatterns = [
    /(export function \w+[^{]*\{)\n/,
    /(export default function \w+[^{]*\{)\n/,
    /(function \w+\([^)]*\)[^{]*\{)\n/,
  ];
  for (const pat of fnPatterns) {
    if (!content.includes("const { t }")) {
      content = content.replace(pat, `$1\n  const { t } = useTranslation();\n`);
    }
  }
  return content;
}

let total = 0;

for (const file of targets) {
  let content = readFileSync(file, "utf8");
  let changed = false;

  for (const [key, nb] of entries) {
    const esc = escapeRe(nb);
    const tCall = `t("admin.${key}")`;
    const tCallBraced = `{${tCall}}`;

    const patterns = [
      [new RegExp(`toast\\.(success|error|info|warning)\\("${esc}"`, "g"), `toast.$1(${tCall}`],
      [new RegExp(`toast\\.(success|error|info|warning)\\('${esc}'`, "g"), `toast.$1(${tCall}`],
      [new RegExp(`\\? "${esc}"`, "g"), `? ${tCall}`],
      [new RegExp(`: "${esc}"`, "g"), `: ${tCall}`],
      [new RegExp(`\\? '${esc}'`, "g"), `? ${tCall}`],
      [new RegExp(`: '${esc}'`, "g"), `: ${tCall}`],
      [new RegExp(`return "${esc}"`, "g"), `return ${tCall}`],
      [new RegExp(`return '${esc}'`, "g"), `return ${tCall}`],
      [new RegExp(`>\\s*${esc}\\s*<`, "g"), `>${tCallBraced}<`],
      [new RegExp(`placeholder="${esc}"`, "g"), `placeholder={${tCall}}`],
      [new RegExp(`aria-label="${esc}"`, "g"), `aria-label={${tCall}}`],
    ];

    for (const [re, repl] of patterns) {
      const next = content.replace(re, repl);
      if (next !== content) {
        content = next;
        changed = true;
        total++;
      }
    }
  }

  if (!changed) continue;
  content = addHooks(content, file);
  writeFileSync(file, content);
  console.log(file);
}

console.log(`Replacements: ${total}`);
