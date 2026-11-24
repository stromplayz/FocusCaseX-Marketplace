#!/usr/bin/env node
/**
 * FocusCaseX-Marketplace — site build & data validation.
 *
 * The public site is a plain multi-page static site hosted on GitHub Pages:
 * index.html, extensions.html, capsules.html, themes.html, templates.html,
 * item.html, install.html, api.html and 404.html are hand-authored HTML.
 * There is NO template/build step for pages — this script does not touch them.
 *
 * It only does two things:
 *   1. Regenerate assets/icons.js from site/icons.json (the lucide path data,
 *      originally extracted by the main repo's scripts/extract-lucide-icons.mjs;
 *      every page loads assets/icons.js before assets/app.js).
 *   2. Validate catalog.json: it must parse, and the item counts per kind plus
 *      the total are printed so a broken data push is obvious in CI output.
 *
 * Any failure exits non-zero with a clear message.
 *
 * Usage: node scripts/build-site.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`build-site: FAILED — ${message}`);
  process.exit(1);
}

/* ------------------------- 1. assets/icons.js --------------------------- */

let icons;
try {
  icons = JSON.parse(readFileSync(join(ROOT, "site", "icons.json"), "utf8"));
} catch (err) {
  fail(`site/icons.json is missing or not valid JSON (${err.message})`);
}
if (!icons || typeof icons !== "object" || Array.isArray(icons) || Object.keys(icons).length === 0) {
  fail("site/icons.json must be a non-empty object mapping icon name to node list");
}

const iconsOut =
  "/* generated — do not hand-edit. Rebuilt by scripts/build-site.mjs from site/icons.json */\n" +
  `window.FCX_ICONS = ${JSON.stringify(icons)};\n`;

try {
  writeFileSync(join(ROOT, "assets", "icons.js"), iconsOut);
} catch (err) {
  fail(`cannot write assets/icons.js (${err.message})`);
}
console.log(
  `icons: assets/icons.js written — ${Object.keys(icons).length} icons, ` +
    `${(Buffer.byteLength(iconsOut, "utf8") / 1024).toFixed(1)} KB`
);

/* ----------------------- 2. catalog.json validation --------------------- */

let catalog;
try {
  catalog = JSON.parse(readFileSync(join(ROOT, "catalog.json"), "utf8"));
} catch (err) {
  fail(`catalog.json is not valid JSON (${err.message})`);
}
if (!catalog || !Array.isArray(catalog.items) || catalog.items.length === 0) {
  fail("catalog.json must contain a non-empty items array");
}

const counts = {};
for (const item of catalog.items) {
  const kind = item && item.kind ? String(item.kind) : "(missing kind)";
  counts[kind] = (counts[kind] || 0) + 1;
}
for (const kind of Object.keys(counts).sort()) {
  console.log(`catalog: ${String(counts[kind]).padStart(3)} ${kind}`);
}
console.log(`catalog: ${String(catalog.items.length).padStart(3)} total`);
if (Array.isArray(catalog.snippets) && catalog.snippets.length) {
  console.log(`catalog: ${String(catalog.snippets.length).padStart(3)} snippets`);
}

console.log("build-site: OK");
