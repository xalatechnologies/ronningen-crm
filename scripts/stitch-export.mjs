#!/usr/bin/env node
/**
 * Download Stitch HTML, bundled assets, and screenshots for a project using
 * the official SDK (same API as Google Stitch MCP / Vercel tools).
 *
 * Prereqs:
 *   - STITCH_API_KEY from Google (Stitch / AI Studio tooling)
 *   - Optional: STITCH_PROJECT_ID (defaults to Rønningen Manager Dashboard)
 *
 * Output: ./stitch-export/ (gitignored) — one folder per screen (slug from title),
 *         plus a design-system folder with DESIGN.md when available.
 *
 * Note: Use `Project` from the SDK package root (includes downloadAssets).
 *       The `stitch.project(id)` singleton returns a bare handle without that method.
 *
 * Docs: https://github.com/google-labs-code/stitch-sdk
 * UI:   https://stitch.withgoogle.com/projects/10088061850876568795
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { Project, StitchToolClient } from "@google/stitch-sdk";

const DEFAULT_PROJECT_ID = "10088061850876568795";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "stitch-export");
const projectId = process.env.STITCH_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID;

if (!process.env.STITCH_API_KEY?.trim()) {
  console.error(
    [
      "Missing STITCH_API_KEY.",
      "",
      "Stitch does not expose screen HTML or images on anonymous HTTP URLs.",
      "Use an API key and this script, or export a .zip from the Stitch UI (⋮ → Export).",
      "",
      "Set STITCH_API_KEY in .env.local (see README), then: npm run stitch:export",
      "",
      "See: https://github.com/google-labs-code/stitch-sdk#configuration",
    ].join("\n"),
  );
  process.exit(1);
}

const client = new StitchToolClient({
  apiKey: process.env.STITCH_API_KEY.trim(),
});
const project = new Project(client, projectId);

console.info(`Exporting project ${projectId} → ${outDir}`);

try {
  const result = await project.downloadAssets(outDir);
  console.info("Done.");
  console.info(JSON.stringify(result, null, 2));
} catch (err) {
  console.error(err);
  process.exit(1);
}
