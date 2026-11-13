// Renders the Event Manager mark (same geometry as src/components/brand/brand-logo.tsx) into the PNG icons the
// web app manifest needs. Output is committed; run `node scripts/generate-pwa-icons.mjs` only if the mark changes.
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const TILE = "#1a4331";
const mark = `
  <rect x="13" y="12" width="6" height="24" rx="3" fill="#ffffff"/>
  <rect x="13" y="12" width="22" height="6" rx="3" fill="#ffffff"/>
  <rect x="19" y="21" width="10" height="6" rx="3" fill="#85b098"/>
  <rect x="13" y="30" width="22" height="6" rx="3" fill="#ffffff"/>`;

/** "any" icons keep the rounded tile; "maskable" icons are full-bleed with the mark inside the 80 % safe zone. */
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="${TILE}"/>${mark}</svg>`;
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${TILE}"/><g transform="translate(24 24) scale(0.78) translate(-24 -24)">${mark}</g></svg>`;

mkdirSync("public/icons", { recursive: true });
const jobs = [
  [rounded, 192, "public/icons/icon-192.png"],
  [rounded, 512, "public/icons/icon-512.png"],
  [maskable, 512, "public/icons/maskable-512.png"],
];
for (const [svg, size, out] of jobs) {
  await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(out);
  console.log("wrote", out);
}
