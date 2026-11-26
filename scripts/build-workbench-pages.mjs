#!/usr/bin/env node
/**
 * FocusCaseX — WorkBench page builder.
 *
 * The marketplace carries ONE published WorkBench (the Solo Optometrist
 * WorkBench). This script renders its two public pages straight from the
 * catalog data so copy, codes and contents can never drift:
 *
 *   marketplace/workbench/index.html   — the WorkBench page: hero, demo
 *                                        band, full description, what's
 *                                        inside, install band.
 *   workbenches/solo-optometry/index.html — the dedicated detail page:
 *                                        every piece with one-liners,
 *                                        theme swatches, page tree,
 *                                        install block.
 *
 * Data sources:
 *   catalog.json                              → the workbenches[] entry
 *   workbenches/solo-optometry/workbench.json → the bundle (contents)
 *   catalog.json items                        → per-item taglines
 *   api/core.json                             → snippet blurbs fallback
 *
 * Usage: node scripts/build-workbench-pages.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(ROOT, "catalog.json"), "utf8"));
const bundle = JSON.parse(readFileSync(join(ROOT, "workbenches", "solo-optometry", "workbench.json"), "utf8"));

/* ---------------- data assembly ---------------- */

const itemsById = new Map((catalog.items ?? []).map((it) => [it.id, it]));

/** catalog item for a bundle ref ("optomize" → plugin:optomize entry) */
function itemFor(kind, id) {
  return itemsById.get(`${kind}:${id}`) ?? itemsById.get(id) ?? null;
}

const blurbs = {
  extension: {},
  capsule: {},
  template: {},
};
for (const kind of Object.keys(blurbs)) {
  const list = bundle.contents[kind === "extension" ? "extensions" : kind === "capsule" ? "capsules" : "templates"] ?? [];
  for (const ref of list) {
    const id = typeof ref === "string" ? ref : ref.id;
    const it = itemFor(kind, id);
    blurbs[kind][id] = { name: it?.name ?? id, line: it?.tagline ?? "" };
  }
}

const snippetRefs = (bundle.contents.snippets ?? []).map((s) => (typeof s === "string" ? s : s.name));
let snippetBlurbs = {};
try {
  const core = JSON.parse(readFileSync(join(ROOT, "api", "core.json"), "utf8"));
  for (const sn of core.snippets ?? []) {
    snippetBlurbs[String(sn.name ?? "").toLowerCase().replace(/\s+/g, "-")] = sn.description ?? "";
  }
} catch { /* fallback: no blurbs */ }

const theme = bundle.contents.theme?.theme ?? null;
const pages = bundle.contents.starterPages ?? [];
const pagesByFolder = new Map();
for (const p of pages) {
  const path = p.path ?? "";
  const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "Pages";
  if (!pagesByFolder.has(folder)) pagesByFolder.set(folder, []);
  pagesByFolder.get(folder).push({ path, title: p.title ?? path.replace(/\.md$/, "").split("/").pop() });
}

const entry = (catalog.workbenches ?? []).find((w) => w.meta?.workbenchId === bundle.id) ?? {};
const NAME = entry.name ?? bundle.name;
const TAGLINE = entry.tagline ?? bundle.description;
const VERSION = entry.version ?? bundle.version;
const CODE = entry.meta?.code ?? bundle.installCodes?.bundle ?? "FCX-2VJD2S";
const MARKET_ID = entry.id ?? `workbench:${bundle.id}`;
const RELEASED = entry.released ?? "";
const DESCRIPTION = bundle.description;

const counts = entry.meta?.contents ?? {
  extensions: (bundle.contents.extensions ?? []).length,
  capsules: (bundle.contents.capsules ?? []).length,
  theme: theme ? 1 : 0,
  templates: (bundle.contents.templates ?? []).length,
  snippets: snippetRefs.length,
  pages: pages.length,
};

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/* ---------------- shared fragments ---------------- */

function namedGroup(label, names, cap) {
  const shown = names.slice(0, cap ?? names.length);
  const more = names.length - shown.length;
  return `<b>${esc(label)}</b> ${esc(shown.join(" · "))}${more > 0 ? ` <span class="wb-more">+${more} more</span>` : ""}`;
}

/** The named-contents chip block (used on cards + hero). */
function contentsChips() {
  const groups = [];
  const extNames = (bundle.contents.extensions ?? []).map((r) => blurbs.extension[r.id]?.name ?? r.id);
  const capNames = (bundle.contents.capsules ?? []).map((r) => blurbs.capsule[r.id]?.name ?? r.id);
  const tplNames = (bundle.contents.templates ?? []).map((r) => blurbs.template[r.id]?.name ?? r.id);
  const snipNames = snippetRefs.map((n) => n.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  const pageNames = pages.map((p) => p.title ?? p.path);
  if (extNames.length) groups.push(`<span class="wb-group" title="${esc(extNames.join(" · "))}">${namedGroup("Extensions:", extNames)}</span>`);
  if (capNames.length) groups.push(`<span class="wb-group" title="${esc(capNames.join(" · "))}">${namedGroup("Capsules:", capNames, 16)}</span>`);
  if (theme) groups.push(`<span class="wb-group"><b>Theme:</b> ${esc(theme.name)}</span>`);
  if (tplNames.length) groups.push(`<span class="wb-group" title="${esc(tplNames.join(" · "))}">${namedGroup("Templates:", tplNames)}</span>`);
  if (snipNames.length) groups.push(`<span class="wb-group" title="${esc(snipNames.join(" · "))}">${namedGroup("Snippets:", snipNames)}</span>`);
  if (pageNames.length) groups.push(`<span class="wb-group" title="${esc(pageNames.join(" · "))}">${namedGroup("Pages:", pageNames)}</span>`);
  return groups.join("");
}

/** Deep-link install block (button + code + copy). The fallback dialog
 *  and wiring live in the page script (wireInstalls + showWbFallback). */
function installBlock(opts = {}) {
  const size = opts.large ? "" : " small";
  return `
<div class="wb-install" style="${opts.large ? "gap:12px;" : ""}">
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
    <button class="btn${size} primary" type="button" data-wb-install="${esc(MARKET_ID)}" data-wb-name="${esc(NAME)}" ${opts.large ? 'style="min-height:48px;"' : ""}>
      ${opts.large ? '<span data-icon="MonitorSmartphone" data-icon-size="17"></span>' : '<span data-icon="MonitorSmartphone" data-icon-size="15"></span>'}
      <span>${opts.large ? "Install — open the app" : "Install — open the app"}</span>
    </button>
    <a class="btn${size}" href="/workbenches/solo-optometry/" style="text-decoration:none;">View the full contents</a>
  </div>
  <div class="code-row">
    <span class="code-token" title="Install code — type this inside the app">${esc(CODE)}</span>
    <button class="chip" type="button" data-copy="${esc(CODE)}" title="Copy install code"><span data-icon="Copy" data-icon-size="13"></span><span>Copy code</span></button>
  </div>
</div>`;
}

/** The demo band — three looping clips from the site's motion set,
 *  same lazy pattern the landing page uses. */
function demoBand() {
  const clips = [
    { src: "demo-register", title: "Register a patient", desc: "Quick-book a slot — the patient file and MR create themselves." },
    { src: "demo-exam", title: "Run the workup", desc: "Pick the patient, record vision, fill normals, write the plan." },
    { src: "demo-dashboard", title: "Read the day at a glance", desc: "Every number resolves from the case files and the day book." },
  ];
  return `
<section class="section-tight" aria-label="The workspace in motion">
  <div class="inside-head">
    <h2>See it run</h2>
    <span>The workspace this WorkBench sets up — captured live.</span>
  </div>
  <div class="wb-demos">
    ${clips
      .map(
        (c, i) => `
    <figure class="wb-demo">
      <div class="wb-demo-frame">
        <video muted loop playsinline preload="none" poster="assets/motion/${c.src}.jpg" data-src="assets/motion/${c.src}.mp4" aria-label="Demo — ${esc(c.title)}"></video>
      </div>
      <figcaption><b>${esc(c.title)}</b><span>${esc(c.desc)}</span></figcaption>
    </figure>`,
      )
      .join("")}
  </div>
</section>`;
}

/** Detail-page listing: every piece with its one-liner. */
function fullListing() {
  const row = (kind, id, name, line) => `
      <li class="wb-piece">
        <span class="tile" style="background:var(--k-${kind}-soft);color:var(--k-${kind});"><span data-icon="${kind === "extension" ? "Puzzle" : kind === "capsule" ? "Braces" : "FileText"}" data-icon-size="15"></span></span>
        <div><b>${esc(name)}</b>${line ? `<span>${esc(line)}</span>` : ""}</div>
        <code class="wb-piece-code">${esc(id)}</code>
      </li>`;
  const group = (title, subtitle, html) => `
    <section class="wb-list-section">
      <h3>${esc(title)}<span>${esc(subtitle)}</span></h3>
      <ul class="wb-piece-list">${html}
      </ul>
    </section>`;

  const ext = Object.entries(blurbs.extension).map(([id, b]) => row("extension", id, b.name, b.line)).join("");
  const cap = Object.entries(blurbs.capsule).map(([id, b]) => row("capsule", id, b.name, b.line)).join("");
  const tpl = Object.entries(blurbs.template).map(([id, b]) => row("template", id, b.name, b.line)).join("");
  const snip = snippetRefs
    .map((n) => {
      const label = n.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return `
      <li class="wb-piece">
        <span class="tile" style="background:var(--k-workbench-soft);color:var(--k-workbench);"><span data-icon="Sparkle" data-icon-size="15"></span></span>
        <div><b>${esc(label)}</b>${snippetBlurbs[n] ? `<span>${esc(snippetBlurbs[n])}</span>` : ""}</div>
        <code class="wb-piece-code">${esc(n)}</code>
      </li>`;
    })
    .join("");
  const pageGroups = [...pagesByFolder.entries()]
    .map(
      ([folder, list]) => `
        <li class="wb-piece">
          <span class="tile" style="background:var(--k-workbench-soft);color:var(--k-workbench);"><span data-icon="BookOpen" data-icon-size="15"></span></span>
          <div><b>${esc(folder)}/</b><span>${esc(list.map((p) => p.title).join(" · "))}</span></div>
          <code class="wb-piece-code">${plural(list.length, "page")}</code>
        </li>`,
    )
    .join("");

  const themeHtml = theme
    ? `
    <section class="wb-list-section">
      <h3>Theme<span>${esc(theme.name)} — ${esc(theme.description ?? "")}</span></h3>
      <div class="wb-theme">
        ${["bg", "bgSidebar", "bgPanel", "text", "textMuted", "accent", "border"]
          .map(
            (k) =>
              `<span class="wb-swatch" title="${k}"><span style="background:${esc(theme.vars?.[k] ?? "#000")}"></span><code>${esc(theme.vars?.[k] ?? "")}</code></span>`,
          )
          .join("")}
        <span class="wb-swatch wb-swatch-wide"><code>radius ${esc(theme.vars?.radius ?? "")}</code></span>
        <span class="wb-swatch wb-swatch-wide"><code>font ${esc(theme.vars?.fontHeading ?? "")} / ${esc(theme.vars?.fontBody ?? "")}</code></span>
      </div>
    </section>`
    : "";

  return `
  ${group(`Extensions · ${plural(counts.extensions ?? blurbs.extension ? Object.keys(blurbs.extension).length : 0, "piece")}`, "Tools that land in the extensions folder, enabled by the bundle", ext)}
  ${group(`Capsules · ${plural(Object.keys(blurbs.capsule).length, "piece")}`, "Live boards and sections the starter pages call into", cap)}
  ${themeHtml}
  ${group(`Templates · ${plural(Object.keys(blurbs.template).length, "piece")}`, "Clinical notes and forms, filed into the page tree", tpl)}
  ${group(`Snippets · ${plural(snippetRefs.length, "piece")}`, "Small CSS touches the bundle enables", snip)}
  ${group(`Starter pages · ${plural(pages.length, "piece")}`, "Created only when missing — an existing page always wins", pageGroups)}`;
}

const HEAD_COMMON = `
<meta charset="utf-8">
<base href="/FocusCaseX/">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" href="icon.svg">
<link rel="stylesheet" href="assets/styles.css">`;

const PAGE_STYLE = `
  /* ---------- single-WorkBench page ---------- */
  .wb-hero-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 6px; }
  .wb-hero-meta .kindchip { font-size: 10.5px; padding: 3px 9px; }
  .wb-hero-meta span.meta { font-size: 12.5px; color: var(--ink-3); }
  .wb-hero-card {
    margin-top: 26px; padding: 20px; border: 1px solid var(--line); border-radius: 14px;
    background: var(--bg-soft);
  }
  .wb-hero-card .wb-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .wb-hero-card .wb-chips span {
    font-family: var(--font-mono); font-size: 11px; letter-spacing: .01em;
    color: var(--ink-2); background: var(--bg-card, #fff);
    border: 1px solid var(--line); border-radius: 6px; padding: 3px 9px;
    white-space: nowrap; line-height: 1.9; text-align: left;
  }
  .wb-chips .wb-group { white-space: normal; flex: 1 1 100%; }
  .wb-chips .wb-group b { font-weight: 600; color: var(--ink); }
  .wb-chips .wb-more { background: none; border: 0; padding: 0; color: var(--ink-3); }
  .wb-install { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
  .wb-install .code-row { margin-top: 0; }
  .wb-install .code-token { font-size: 12.5px; padding: 7px 11px; letter-spacing: .1em; }
  .wb-note { margin-top: 20px; color: var(--ink-3); font-size: 13.5px; }

  /* demo band */
  .wb-demos { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
  .wb-demo { margin: 0; }
  .wb-demo-frame {
    aspect-ratio: 16 / 10; border: 1px solid var(--line); border-radius: 12px;
    overflow: hidden; background: #101418;
  }
  .wb-demo-frame video { width: 100%; height: 100%; object-fit: contain; display: block; }
  .wb-demo figcaption { display: flex; flex-direction: column; gap: 2px; padding-top: 10px; }
  .wb-demo figcaption b { font-family: var(--font-display); font-size: 14px; }
  .wb-demo figcaption span { font-size: 12.5px; color: var(--ink-3); }

  /* detail-page piece lists */
  .wb-list-section { margin-top: 34px; }
  .wb-list-section h3 { font-size: 17px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .wb-list-section h3 span { font-size: 12.5px; color: var(--ink-3); font-weight: 400; }
  .wb-piece-list { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .wb-piece {
    display: flex; align-items: flex-start; gap: 12px;
    border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; background: var(--bg-card, #fff);
  }
  .wb-piece .tile { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex: none; margin-top: 1px; }
  .wb-piece > div { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .wb-piece b { font-size: 13.5px; }
  .wb-piece span { font-size: 12.5px; color: var(--ink-3); line-height: 1.5; }
  .wb-piece-code { font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); background: var(--bg-soft); border: 1px solid var(--line); border-radius: 6px; padding: 2px 8px; flex: none; align-self: center; }

  /* theme swatches */
  .wb-theme { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
  .wb-swatch { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; background: var(--bg-card, #fff); }
  .wb-swatch > span:first-child { width: 22px; height: 22px; border-radius: 6px; border: 1px solid rgba(0,0,0,.12); display: inline-block; }
  .wb-swatch code { font-family: var(--font-mono); font-size: 11px; color: var(--ink-2); }
  .wb-swatch-wide > code { font-size: 12px; }
  .wb-pages-tree { font-family: var(--font-mono); font-size: 12.5px; color: var(--ink-2); line-height: 2; }
  .wb-pages-tree b { color: var(--ink); font-weight: 600; }
`;

/** Shared page tail script: icons, header/footer, install wiring, lazy videos. */
function pageScript() {
  return `
<script src="assets/icons.js"></script>
<script src="assets/app.js"></script>
<script>
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.outerHTML = FCX.icon(el.getAttribute("data-icon"), Number(el.getAttribute("data-icon-size")) || 16);
  });

  FCX.ready({ active: "marketplace" }).then(() => {
    /* ---------- install: same fcx://install flow as the kind pages.
       The WorkBench resolves inside the app (curated build-side), the app
       lists every piece and asks once — the install is confirmed and runs
       entirely in the app. Without the app, the code fallback appears. ---------- */
    function showWbFallback(id, name) {
      const code = ${JSON.stringify(CODE)};
      const el = document.createElement("div");
      el.className = "ov open";
      el.setAttribute("role", "dialog");
      el.innerHTML = \`
<div class="ov-backdrop" data-fx-close></div>
<div class="ov-panel" style="max-width:440px;">
  <div style="padding:22px 22px 8px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="width:38px;height:38px;border-radius:10px;background:var(--k-workbench-soft);color:var(--k-workbench);display:flex;align-items:center;justify-content:center;">\${FCX.icon("MonitorSmartphone", 19)}</span>
      <div><b style="font-family:var(--font-display);font-size:15.5px;">Open this in FocusCaseX</b>
      <div style="font-size:12px;color:var(--ink-3);">On the device that has the app installed</div></div>
    </div>
    <p style="margin-top:14px;font-size:13px;color:var(--ink-2);line-height:1.55;">
      The install button hands <b>\${FCX.esc(name)}</b> to the FocusCaseX app on this device, where you confirm the install.
      If the app isn't on this device, type the code below in the app instead —
      <b>Settings → Marketplace → Install by code</b>.
    </p>
  </div>
  <div style="padding:10px 22px 6px;">
    <div class="code-row" style="margin-top:2px;">
      <span class="code-token">\${FCX.esc(code)}</span>
      <button class="chip" type="button" data-copy="\${FCX.esc(code)}">\${FCX.icon("Copy", 13)}<span>Copy code</span></button>
    </div>
    <div style="display:flex;gap:9px;margin:14px 0 6px;">
      <a class="btn small primary" href="/install/">Get the app</a>
      <button class="btn small" type="button" data-fx-close>Close</button>
    </div>
  </div>
</div>\`;
      document.body.appendChild(el);
      FCX.wireCopyButtons(el);
      el.querySelectorAll("[data-fx-close]").forEach((x) =>
        x.addEventListener("click", () => x.closest(".ov") && x.closest(".ov").remove()));
    }

    document.querySelectorAll("[data-wb-install]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const id = btn.getAttribute("data-wb-install");
        const name = btn.getAttribute("data-wb-name") || ${JSON.stringify(NAME)};
        let switched = false;
        const onHide = () => { switched = true; };
        document.addEventListener("visibilitychange", onHide, { once: true });
        window.addEventListener("pagehide", onHide, { once: true });
        window.addEventListener("blur", onHide, { once: true });
        try { location.href = FCX.deepLinkUrl(id); } catch (e) { /* blocked — fallback covers it */ }
        setTimeout(() => {
          if (!switched && !document.hidden) showWbFallback(id, name);
        }, 1900);
      });
    });

    /* lazy demo videos — load when scrolled near, pause offscreen */
    const vids = document.querySelectorAll("video[data-src]");
    if (vids.length) {
      const io = new IntersectionObserver((entries) => {
        for (const en of entries) {
          const v = en.target;
          if (en.isIntersecting) {
            if (!v.src && v.dataset.src) v.src = v.dataset.src;
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        }
      }, { rootMargin: "200px" });
      vids.forEach((v) => io.observe(v));
    }
  });
</script>`;
}

/* ---------------- page 1: marketplace/workbench/ ---------------- */

const hubPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(NAME)} — FocusCaseX WorkBench</title>
<meta name="description" content="${esc(TAGLINE)} ${esc(NAME)} bundles ${plural(counts.extensions, "extension")}, ${plural(counts.capsules, "capsule")}, a theme, ${plural(counts.templates, "template")}, ${plural(counts.snippets, "snippet")} and ${plural(counts.pages, "starter pages")} into one install. Install code ${esc(CODE)}.">
${HEAD_COMMON}
<style>${PAGE_STYLE}</style>
</head>
<body>
<header id="site-header"></header>
<main>
  <div class="wrap">

    <section class="page-head">
      <div class="kicker">WorkBench</div>
      <h1>${esc(NAME)}</h1>
      <p class="lede">${esc(TAGLINE)}</p>
      <div class="wb-hero-meta">
        <span class="kindchip" style="--chip-c:var(--k-workbench);--chip-soft:var(--k-workbench-soft);">${esc(entry.category ?? "WorkBench")}</span>
        <span class="meta">v${esc(VERSION)}</span>
        <span class="meta">·</span>
        <span class="meta">${esc(entry.author ?? "CaseX Labs")}</span>
        ${RELEASED ? `<span class="meta">·</span><span class="meta">Updated ${esc(RELEASED)}</span>` : ""}
        <span class="meta">·</span>
        <span class="meta">Install code <b style="font-family:var(--font-mono);color:var(--ink);">${esc(CODE)}</b></span>
      </div>
      <p class="explain">One install configures the whole workspace — ${plural(counts.extensions, "extension")}, ${plural(counts.capsules, "capsule")}, 1 theme, ${plural(counts.templates, "template")}, ${plural(counts.snippets, "snippet")}, ${plural(counts.pages, "starter pages")} and the settings snapshot. Free.</p>
    </section>

    ${installBlock({ large: true })}

    <section class="section-tight" aria-label="What this WorkBench installs">
      <div class="wb-hero-card">
        <p style="margin:0 0 12px;font-size:14px;color:var(--ink);"><b>${esc(DESCRIPTION)}</b></p>
        <div class="wb-chips">
          ${contentsChips()}
        </div>
        <p class="wb-note" style="margin-top:14px;">Every piece is listed before you confirm — the full per-item breakdown with descriptions is on the <a href="/workbenches/solo-optometry/" style="color:var(--blue);font-weight:600;">WorkBench detail page</a>.</p>
      </div>
    </section>

    ${demoBand()}

    <!-- HOW INSTALL WORKS -->
    <section class="section-tight" aria-label="How the install works">
      <div class="inside-head">
        <h2>How the install works</h2>
        <span>Tap, hand off, confirm — the whole flow runs in the app.</span>
      </div>
      <div class="entries">
        <div class="entry">
          <span class="tile" style="background:var(--k-workbench-soft);color:var(--k-workbench);"><span data-icon="MonitorSmartphone" data-icon-size="19"></span></span>
          <h3>Tap Install here</h3>
          <p>Your browser hands the WorkBench to the FocusCaseX app on this device — no copy-paste needed.</p>
        </div>
        <div class="entry">
          <span class="tile" style="background:var(--k-workbench-soft);color:var(--k-workbench);"><span data-icon="ListChecks" data-icon-size="19"></span></span>
          <h3>The app lists everything</h3>
          <p>The WorkBench opens inside the marketplace with its full contents — extensions, capsules, theme, templates, snippets and pages.</p>
        </div>
        <div class="entry">
          <span class="tile" style="background:var(--k-workbench-soft);color:var(--k-workbench);"><span data-icon="CircleCheckBig" data-icon-size="19"></span></span>
          <h3>You confirm once</h3>
          <p>Tap Apply and the install runs in the app with per-step progress, then a final summary of everything that landed. Nothing is deleted; patient records are never touched.</p>
        </div>
        <div class="entry">
          <span class="tile" style="background:var(--k-workbench-soft);color:var(--k-workbench);"><span data-icon="ArrowLeftRight" data-icon-size="19"></span></span>
          <h3>Switch modes anytime</h3>
          <p>Applied WorkBenches appear as modes in the app — Marketplace → WorkBenches. Tap a chip to shuffle the whole workspace to another setup; your records stay put.</p>
        </div>
      </div>
      <p class="wb-note">No app on this device? Type the code under <b>Settings → Marketplace → Install by code</b>, or see the <a href="/install/#browser" style="color:var(--blue);font-weight:600;">install guide</a>.</p>
    </section>

    <!-- TRUST -->
    <section class="section-tight" aria-label="Why WorkBenches are safe">
      <div class="trust">
        <div class="t-item">
          <span data-icon="CircleCheckBig" data-icon-size="18"></span>
          <div>
            <b>One confirm before anything lands</b>
            <span>The app lists every extension, capsule, template and page the WorkBench adds. You confirm once — the whole bundle installs.</span>
          </div>
        </div>
        <div class="t-item">
          <span data-icon="Trash2" data-icon-size="18"></span>
          <div>
            <b>Remove piece by piece</b>
            <span>Anything the WorkBench installs can be removed later under Settings — the bundle adds tools and pages, it never moves your patient records.</span>
          </div>
        </div>
        <div class="t-item">
          <span data-icon="BadgeCheck" data-icon-size="18"></span>
          <div>
            <b>Reviewed by CaseX Labs</b>
            <span>The WorkBench is built and reviewed before it lands here, like the rest of the marketplace.</span>
          </div>
        </div>
      </div>
    </section>

  </div>

  <!-- BUILD YOUR OWN BAND (black) -->
  <section class="band" style="margin-top:56px;">
    <div class="wrap section">
      <div class="kicker">Build your own</div>
      <h2>Your setup, saved as one bundle.</h2>
      <p class="lede" style="margin-top:14px;max-width:720px;">Any clinic can turn its current workspace into a WorkBench. In the app, open <b>Settings → Marketplace → Save as WorkBench</b> — FocusCaseX packs your extensions, capsules, theme, templates, snippets, pages and settings into one shareable bundle. Hand it to a second branch or a colleague and they install the whole setup in one step. The WorkBench Builder on the MCP &amp; Automation page can also draft a starter bundle from a plain description of how your clinic works.</p>
      <div class="hero-cta">
        <a class="btn blue-on-dark" href="/install/" style="min-height:48px;">Install the app</a>
        <a class="btn dark-ghost" href="/mcp/" style="min-height:48px;">WorkBench Builder — MCP &amp; Automation</a>
      </div>
    </div>
  </section>

</main>
<footer id="site-footer"></footer>
${pageScript()}
</body>
</html>
`;

/* ---------------- page 2: workbenches/solo-optometry/ ---------------- */

const detailPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(NAME)} — full contents — FocusCaseX</title>
<meta name="description" content="Every piece inside ${esc(NAME)}: ${plural(counts.extensions, "extension")}, ${plural(counts.capsules, "capsule")}, the ${esc(theme?.name ?? "")} theme, ${plural(counts.templates, "template")}, ${plural(counts.snippets, "snippet")}, ${plural(counts.pages, "starter pages")} — with install code ${esc(CODE)}.">
${HEAD_COMMON}
<style>${PAGE_STYLE}</style>
</head>
<body>
<header id="site-header"></header>
<main>
  <div class="wrap">

    <section class="page-head">
      <div class="kicker">WorkBench — full contents</div>
      <h1>${esc(NAME)}</h1>
      <p class="lede">${esc(DESCRIPTION)}</p>
      <div class="wb-hero-meta">
        <span class="kindchip" style="--chip-c:var(--k-workbench);--chip-soft:var(--k-workbench-soft);">${esc(entry.category ?? "WorkBench")}</span>
        <span class="meta">v${esc(VERSION)}</span>
        <span class="meta">·</span>
        <span class="meta">${plural(counts.extensions, "extension")}</span>
        <span class="meta">·</span>
        <span class="meta">${plural(counts.capsules, "capsule")}</span>
        <span class="meta">·</span>
        <span class="meta">1 theme</span>
        <span class="meta">·</span>
        <span class="meta">${plural(counts.templates, "template")}</span>
        <span class="meta">·</span>
        <span class="meta">${plural(counts.snippets, "snippet")}</span>
        <span class="meta">·</span>
        <span class="meta">${plural(counts.pages, "starter page")}</span>
      </div>
    </section>

    <section class="section-tight" aria-label="Install the WorkBench">
      <div class="wb-hero-card">
        ${installBlock({})}
        <p class="wb-note" style="margin-top:14px;">The install is confirmed inside the app: it lists every piece below, you tap Apply once, and the whole setup lands with per-step progress. Nothing is deleted; patient records are never touched. Install code works too — <b>Settings → Marketplace → Install by code</b>.</p>
      </div>
    </section>

    <section aria-label="Every piece in the bundle">
      ${fullListing()}
    </section>

    <section class="section-tight" aria-label="The bundle file">
      <div class="inside-head">
        <h2>The bundle file</h2>
        <span>One JSON, portable and inspectable.</span>
      </div>
      <p style="font-size:13.5px;color:var(--ink-2);max-width:720px;line-height:1.6;">The whole WorkBench is a single JSON file — the same file the app installs and the same file <b>Save current setup as WorkBench</b> produces. Open it, diff it, share it: <a href="/workbenches/solo-optometry/workbench.json" style="color:var(--blue);font-weight:600;font-family:var(--font-mono);">workbenches/solo-optometry/workbench.json</a>.</p>
    </section>

    <!-- HOW INSTALL WORKS -->
    <section class="section-tight" aria-label="Switching modes">
      <div class="trust">
        <div class="t-item">
          <span data-icon="ArrowLeftRight" data-icon-size="18"></span>
          <div>
            <b>WorkBenches switch like modes</b>
            <span>After this WorkBench is applied it appears in Marketplace → WorkBenches as the active mode. Tap another WorkBench chip to shuffle the whole workspace to that setup — extensions, capsules, theme, templates and pages re-configure in one confirmed step.</span>
          </div>
        </div>
        <div class="t-item">
          <span data-icon="ShieldCheck" data-icon-size="18"></span>
          <div>
            <b>Your records stay in the vault</b>
            <span>WorkBenches carry setup, never data. Applying a mode never deletes anything and never reads patient records — starter pages are created only when missing.</span>
          </div>
        </div>
        <div class="t-item">
          <span data-icon="Package" data-icon-size="18"></span>
          <div>
            <b>Save your own and share it</b>
            <span>Once the workspace is the way you want it, Settings → Marketplace → Save as WorkBench packs it into the same JSON shape — ready for a second branch or a colleague.</span>
          </div>
        </div>
      </div>
    </section>

  </div>
</main>
<footer id="site-footer"></footer>
${pageScript()}
</body>
</html>
`;

writeFileSync(join(ROOT, "marketplace", "workbench", "index.html"), hubPage);
writeFileSync(join(ROOT, "workbenches", "solo-optometry", "index.html"), detailPage);
console.log(
  `workbench pages built: marketplace/workbench/index.html + workbenches/solo-optometry/index.html`,
  `(${NAME} v${VERSION}, code ${CODE}, ${plural(counts.extensions, "extension")}, ${plural(counts.capsules, "capsule")}, ${plural(counts.templates, "template")}, ${plural(counts.snippets, "snippet")}, ${plural(counts.pages, "page")})`,
);
