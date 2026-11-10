import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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

let fixed = 0;

for (const file of targets) {
  let content = readFileSync(file, "utf8");
  const original = content;

  // Fix hook wrongly inserted in destructured params
  content = content.replace(
    /export function (\w+)\(\{\n\s*const \{ t \} = useTranslation\(\);\n/g,
    "export function $1({\n",
  );
  content = content.replace(
    /export default function (\w+)\(\{\n\s*const \{ t \} = useTranslation\(\);\n/g,
    "export default function $1({\n",
  );

  // Ensure hook at start of function body when useTranslation is imported but hook missing in body
  if (content.includes("useTranslation") && !content.includes("const { t } = useTranslation()")) {
    content = content.replace(
      /(export (?:default )?function \w+\([^)]*\)[^{]*\{)\n(\s*)(?!const \{ t \})/,
      "$1\n$2const { t } = useTranslation();\n$2",
    );
  }

  if (content !== original) {
    writeFileSync(file, content);
    fixed++;
    console.log(file);
  }
}

console.log(`Fixed ${fixed} files`);
