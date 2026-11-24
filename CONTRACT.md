# MARKETPLACE SITE v2 — BUILD CONTRACT (agents read this + the real files)

Goal: a **stunning, clean, non-sci-fi, organized** marketplace site that fixes
"71 items dumped on one flat grid". Multi-page, vanilla JS, GitHub Pages.

## The four agents' synthesized spec (authoritative)

- **IA**: one kind per page. Landing never dumps grids. Browse pages show a
  12-card cap + "Show all N". Every item gets a shareable detail URL
  (`item.html?id=...`). Themes are visually swatch-first but quarantined on
  their own page (last nav position).
- **Visual**: warm paper `#FAF9F7`, deep clinic green accent `#146C60`,
  Fraunces display + Inter UI, flat cards (no shadows at rest), no badge/pill
  spam on cards, whitespace separates sections (88px), 1080px max width.
- **Trust**: NO ratings, NO download counts anywhere. Show: author, version,
  "Updated <Mon YYYY>", verified shield (tooltip: "Reviewed and published by
  CaseX Labs"). No invented testimonials, no user counts, no compliance claims.
- **Usefulness**: global search overlay (`/` opens, grouped results, keyboard
  nav) — already built in app.js. Per-kind detail content (below). Install
  block on every detail page (already built: FCX.installSteps).

## Files that ALREADY EXIST (read them before writing your page)

- `assets/styles.css` — full design system. Use its classes; do not restyle.
- `assets/app.js` — `window.FCX` runtime (API below).
- `assets/icons.js` — 55 lucide icons (loaded before app.js).
- `catalog.json` — data. 71 items: `{id, kind(plugin|capsule|theme|template),
  name, tagline, description, author, version, category, tags, icon, rating,
  reviews, downloads, released, verified, featured, meta, files}`.
  **Never render `rating`/`reviews`/`downloads`.**
- `themes/<id>.json` — theme palettes (`vars`: bg, bgPanel, text, accent,
  border, muted, ...). 21/22 have colors; default-dark falls back via FCX.
- `templates/<id>.md` — template markdown bodies.

## REQUIRED page skeleton (exact — copy this)

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>...</title>
<meta name="description" content="...">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,560;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" href="icon.svg">
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<header id="site-header"></header>
<main>
  <!-- page content -->
</main>
<footer id="site-footer"></footer>
<script src="assets/icons.js"></script>
<script src="assets/app.js"></script>
<script>
  // page logic — always start with:
  FCX.ready({ active: "plugin" /* or null */ }).then(() => { /* render */ });
</script>
</body>
</html>
```

ALL links/pages/assets are **relative** (site lives at a subpath:
/github.io/FocusCaseX-Marketplace/). No build step. No CDNs except Google
Fonts. No emoji. English only.

## FCX API (assets/app.js — the real signatures)

- `FCX.ready({active: "plugin"|"capsule"|"theme"|"template"|null, search:bool})`
  → Promise. Loads catalog, injects header/footer, builds search overlay.
- `FCX.items` — normalized 71 items. `FCX.byId(id)`.
- `FCX.KINDS[kind]` → `{label, one, page, icon, c, soft}`; `FCX.KIND_ORDER`.
- `FCX.icon(name, size)` → inline SVG string.
- `FCX.cardHtml(item, {copyEmbed:bool})` → canonical card html
  (tile + name + shield + 2-line desc + author/updated meta). For themes it
  includes `<span class="swatches hidden" data-swatches="theme:<id>">` which
  `wireGrid` hydrates into real swatches.
- `FCX.renderGrid(items, {cap:12, copyEmbed:bool})` → grid + hidden rest +
  "Show all N" button. Then call `FCX.wireGrid(container)` after setting
  innerHTML.
- `FCX.renderTabs(el, [{id,label,count}], activeId, onChange)` — pill tabs.
- `FCX.SORTS = {recommended, az, newest}` — order functions (no sort dropdown
  needed unless your page benefits; "recommended" = featured → newest → name).
- `FCX.itemUrl(id)`, `FCX.embedFence(capsuleId)`,
  `FCX.getParam(name)`, `FCX.setParam(name, value)`.
- `FCX.fetchThemeVars(themeItem)` → Promise<vars> (with default-dark fallback);
  `FCX.swatchesHtml(vars)`; `FCX.themePreviewHtml(vars)` (mini workspace mock).
- `FCX.demoBoardHtml(caption)` → sample appointment board (stats + 4 rows).
- `FCX.fetchTemplateBody(templateItem)` → Promise<markdown>;
  `FCX.renderMd(text)` → safe mini-rendered html (headings/lists/tables/bold).
- `FCX.installSteps(item)` → the green 3-step install block.
- `FCX.related(item, 3)` → same-kind similar items (ordered).
- `FCX.openSearch()` / `FCX.copyText(t)` (wire copyable elements with
  `data-copy="<text>"` then `FCX.wireCopyButtons(document)`).

## Copy (use EXACTLY — final strings from the content agent)

- Hero eyebrow: `Free & included with FocusCaseX`
- Hero H1: `Built for eye clinics. Ready when you are.`
- Hero sub: `71 free add-ons for FocusCaseX — appointment boards, refraction
  notes, themes and more. One tap inside the app, no setup, no cost.`
- Primary CTA: `Browse the catalog` · Secondary CTA: `See how install works`
- Search placeholder: `Search — try "refraction" or "appointments"`
- Empty state: `No add-on matches that. Try a shorter word, or tap a category below.`
- Capsule explainer (one sentence, pinned on capsules pages):
  `A capsule is a ready-made section — like an appointment board or a
  patient's visit history — that you drop into any clinic page with one tap.`
- Tab descriptors: Extensions `Small tools that add features` · Capsules
  `Ready-made sections for your pages` · Themes `A new look for the whole
  workspace` · Templates `Pre-written clinical notes and forms`
- Card fallback desc: `This add-on doesn't have a full description yet — see
  the install steps below.`
- BANNED WORDS in any user-visible copy: manifest, payload, delta, vault,
  registry, fence, schema, injection. Say "your clinic records" not "vault",
  "the catalog" not "registry". Keep "Extensions" (never "plugins" in UI);
  "Capsules" keeps its name.

## Install steps (canonical 3 — FCX.installSteps already renders these)

1. Open FocusCaseX → Settings → Marketplace.
2. Search for <Name> under <Kind>.
3. Tap Install — it appears in your workspace right away.

## Page list (one agent owns one file — no overlaps)

| File | Owner |
|---|---|
| `index.html` | B1 |
| `extensions.html` | B2 |
| `capsules.html` | B3 |
| `themes.html` | B4 |
| `templates.html` | B5 |
| `item.html` | B6 |
| `install.html` + `404.html` | B7 |
| `api.html` + `scripts/build-site.mjs` rewrite | B8 |
| `robots.txt` + `sitemap.xml` + favicons/OG + meta audit | B9 |

## Hard quality bar

- Zero console errors; everything must work from `file://` except fonts.
- No horizontal overflow at 360px; tap targets ≥ 44px; no hover-only
  affordances.
- Nothing below 12px type. No uppercase pills/badges on cards.
- Never render rating/reviews/downloads. Never feature a 0-data row with
  fake numbers.
- Keep every page's body copy light: a page reads in 2–3 scrolls.
