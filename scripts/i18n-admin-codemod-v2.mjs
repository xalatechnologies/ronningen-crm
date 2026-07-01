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
    else if (p.endsWith(".tsx")) files.push(p);
  }
  return files;
}

const targets = [
  ...walk("src/components/admin"),
  ...walk("src/app/admin"),
];

const entries = Object.entries(adminNb).sort(([, a], [, b]) => b.length - a.length);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shouldSkipLine(line) {
  const t = line.trim();
  return (
    t.startsWith("import ") ||
    t.startsWith("export type") ||
    t.startsWith("type ") ||
    t.startsWith("//") ||
    t.includes("Record<") ||
    t.includes("as const") ||
    (/^(export )?const \w+/.test(t) && t.includes(": {")) ||
    (/^(export )?const \w+.*=.*\[/.test(t) && t.includes("label:"))
  );
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
  if (!content.includes("const { t }")) {
    content = content.replace(
      /(export function \w+[^{]*\{)\n/,
      `$1\n  const { t } = useTranslation();\n`,
    );
    if (!content.includes("const { t }")) {
      content = content.replace(
        /(export default function \w+[^{]*\{)\n/,
        `$1\n  const { t } = useTranslation();\n`,
      );
    }
  }
  return content;
}

let total = 0;

for (const file of targets) {
  let lines = readFileSync(file, "utf8").split("\n");
  let changed = false;

  for (const [key, nb] of entries) {
    const esc = escapeRe(nb);
    const tCall = `{t("admin.${key}")}`;
    const tCallBare = `t("admin.${key}")`;

    for (let i = 0; i < lines.length; i++) {
      if (shouldSkipLine(lines[i])) continue;
      let line = lines[i];
      const orig = line;

      line = line.replace(new RegExp(`(\\w+)="${esc}"`, "g"), `$1=${tCall}`);
      line = line.replace(new RegExp(`(\\w+)='${esc}'`, "g"), `$1=${tCall}`);
      line = line.replace(new RegExp(`>(\\s*)${esc}(\\s*)<`), `>$1${tCall}$2<`);
      line = line.replace(
        new RegExp(`(title|description|label|placeholder|emptyLabel|hint|aria-label)=\\{?"${esc}"\\}?`),
        `$1={${tCallBare}}`,
      );

      if (line !== orig) {
        lines[i] = line;
        changed = true;
        total++;
      }
    }
  }

  if (!changed) continue;
  let content = lines.join("\n");
  content = addHooks(content, file);
  writeFileSync(file, content);
  console.log(file);
}

console.log(`Replacements: ${total}`);
