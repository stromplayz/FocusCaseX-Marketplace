#!/usr/bin/env node
/**
 * FocusCaseX-Marketplace — registry builder.
 *
 * Reads catalog.json, verifies every referenced asset exists on disk and
 * emits api/registry.json — the catalog the app's MarketplaceHub merges
 * into its in-app index (the API mediator contract: fcx.market.registry.v1).
 *
 * Usage: node scripts/build-registry.mjs
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(ROOT, "catalog.json");
const corePath = join(ROOT, "api", "core.json");
const registryPath = join(ROOT, "api", "registry.json");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
let core = null;
try {
  core = JSON.parse(readFileSync(corePath, "utf8"));
} catch {
  core = null;
}

const problems = [];
const present = [];
for (const item of catalog.items) {
  if (item.files) {
    for (const [layer, rel] of Object.entries(item.files)) {
      const p = join(ROOT, rel);
      if (!existsSync(p)) problems.push(`${item.id}: missing ${layer} file ${rel}`);
    }
  }
  present.push(item);
}
for (const s of catalog.snippets ?? []) {
  if (!existsSync(join(ROOT, s.file))) problems.push(`snippet ${s.id}: missing ${s.file}`);
}

const counts = {};
for (const item of present) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
counts.all = present.length;

/* the app-release database — every FocusCaseXDroid release with its
   version code, bundled core and changelog (releases.json at the repo
   root). Surfaced here so clients and the clinic can see exactly what
   shipped, when, and what changed. */
let releases = null;
try {
  const raw = JSON.parse(readFileSync(join(ROOT, "releases.json"), "utf8"));
  releases = Array.isArray(raw.releases) ? raw.releases : null;
} catch {
  releases = null;
}

const registry = {
  schema: "fcx.market.registry.v1",
  generatedAt: new Date().toISOString(),
  coreVersion: core?.version ?? "0.0.0",
  app: {
    name: "FocusCaseX",
    repo: "stromplayz/FocusCaseX",
    ...(releases
      ? {
          latestRelease: releases[0]?.version ?? null,
          releases,
        }
      : {}),
  },
  counts,
  items: present,
  snippets: catalog.snippets ?? [],
};

writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");

if (problems.length > 0) {
  console.error("REGISTRY BUILD FAILED — missing assets:");
  for (const p of problems) console.error("  -", p);
  process.exit(1);
}
console.log(`registry built: ${present.length} items (${JSON.stringify(counts)}) → api/registry.json`);
