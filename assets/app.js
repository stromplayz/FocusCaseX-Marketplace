/**
 * FocusCaseX — core runtime (vanilla JS, no dependencies). v5 "site".
 * The public site is FocusCaseX; the marketplace is a section of it.
 * Shared by every page: catalog loading, chrome injection (topbar/footer),
 * canonical card renderer, kind tabs, show-all expander, global search
 * overlay, theme previews painted with real theme variables, per-capsule
 * live demo boards, per-extension functional previews, markdown renderer,
 * clipboard, install codes, fcx:// deep-link install with fallback panel.
 *
 * Exposes window.FCX. Pages load:
 *   <script src="assets/icons.js"></script>
 *   <script src="assets/app.js"></script>
 *   [optional] <script src="assets/demos.js"></script>  ← per-item demos
 * and start with FCX.ready().then(...)
 */
(function () {
  "use strict";

  const ICONS = window.FCX_ICONS || {};
  const CATALOG_URL = "catalog.json";
  const CACHE_KEY = "fcx.market.catalog.v4";
  const APP_LINK = "https://focuscasex.vercel.app";

  /* ----------------------------- small utils ----------------------------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function icon(name, size, cls) {
    const node = ICONS[name];
    const s = size || 16;
    if (!node || !node.length) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls || ""}" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>`;
    }
    const body = node
      .map((p) => {
        const a = Object.assign({}, p.attrs || {});
        delete a.key;
        const attrs = Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ");
        return `<${p.tag}${attrs ? " " + attrs : ""}></${p.tag}>`;
      })
      .join("");
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls || ""}" aria-hidden="true">${body}</svg>`;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    if (!iso || typeof iso !== "string" || !/^\d{4}-\d{2}/.test(iso)) return "";
    const y = iso.slice(0, 4);
    const m = parseInt(iso.slice(5, 7), 10) - 1;
    if (m < 0 || m > 11) return "";
    return `${MONTHS[m]} ${y}`;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    return true;
  }

  function getParam(name) {
    return new URLSearchParams(location.search).get(name) || "";
  }
  function setParam(name, value) {
    const u = new URL(location.href);
    if (value) u.searchParams.set(name, value);
    else u.searchParams.delete(name);
    history.replaceState(null, "", u.toString());
  }

  /* --------------------------- banned-word cleaner -------------------------
   * CONTRACT.md forbids these words in user-visible copy. item.html cleans
   * its own long copy; this sibling keeps card taglines and search results
   * (which render catalog text verbatim) safe on browse pages too.
   * Word-boundary safe, case-insensitive, idempotent. */
  const CLEAN = [
    [/\/bvault\b/gi, "your clinic records"],
    [/\byour vault\b/gi, "your clinic records"],
    [/\bthe vault\b/gi, "your clinic records"],
    [/\bvault\b/gi, "your clinic records"],
    [/\bregistries\b/gi, "catalogs"],
    [/\bregistry\b/gi, "catalog"],
    [/\bmanifests\b/gi, "definition files"],
    [/\bmanifest\b/gi, "definition file"],
    [/\bfences\b/gi, "blocks"],
    [/\bfence\b/gi, "block"],
    [/\bpayloads\b/gi, "data"],
    [/\bpayload\b/gi, "data"],
    [/\bdeltas\b/gi, "change markers"],
    [/\bdelta\b/gi, "change marker"],
    [/\bplugins\b/gi, "extensions"],
    [/\bplugin\b/gi, "extension"],
  ];
  function cleanCopy(text) {
    let t = String(text == null ? "" : text);
    CLEAN.forEach((pair) => { t = t.replace(pair[0], pair[1]); });
    // fix the article after "plugin" → "extension": "A extension" → "An extension"
    t = t.replace(/\b(a)\s+(extension)\b/gi, (_m, art) => (art[0] === "A" ? "An " : "an ") + "extension");
    return t;
  }

  /* ------------------------------ kind meta ------------------------------ */

  const KINDS = {
    plugin: {
      id: "plugin", label: "Extensions", one: "Small tools that add features",
      page: "/marketplace/extensions/", icon: "Puzzle",
      c: "var(--k-extension)", soft: "var(--k-extension-soft)",
    },
    capsule: {
      id: "capsule", label: "Capsules", one: "Ready-made sections for your pages",
      page: "/marketplace/capsules/", icon: "Braces",
      c: "var(--k-capsule)", soft: "var(--k-capsule-soft)",
    },
    theme: {
      id: "theme", label: "Themes", one: "A new look for the whole workspace",
      page: "/marketplace/themes/", icon: "Palette",
      c: "var(--k-theme)", soft: "var(--k-theme-soft)",
    },
    template: {
      id: "template", label: "Templates", one: "Pre-written clinical notes and forms",
      page: "/marketplace/templates/", icon: "FileText",
      c: "var(--k-template)", soft: "var(--k-template-soft)",
    },
    workbench: {
      id: "workbench", label: "WorkBenches", one: "One bundle — a whole pre-configured EMR",
      page: "/marketplace/workbench/", icon: "Layers",
      c: "var(--k-workbench)", soft: "var(--k-workbench-soft)",
      new: true,
    },
  };
  const KIND_ORDER = ["workbench", "plugin", "capsule", "theme", "template"];

  /* ------------------------------ catalog -------------------------------- */

  let ITEMS = [];
  let BY_ID = {};
  let GENERATED_AT = "";

  function normalize(raw) {
    const kind = raw.kind === "plugin" ? "plugin" : raw.kind;
    return {
      id: raw.id,
      kind,
      name: raw.name || raw.id,
      tagline: (raw.tagline || "").replace(/\s+/g, " ").trim(),
      description: (raw.description || "").trim(),
      author: raw.author || "CaseX Labs",
      version: raw.version || "",
      category: raw.category || "",
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      icon: raw.icon || (KINDS[kind] ? KINDS[kind].icon : "Package"),
      featured: raw.featured === true,
      verified: raw.verified !== false,
      released: raw.released || "",
      downloads: typeof raw.downloads === "number" ? raw.downloads : 0,
      files: raw.files && typeof raw.files === "object" ? raw.files : {},
      meta: raw.meta && typeof raw.meta === "object" ? raw.meta : {},
    };
  }

  async function loadCatalog() {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const d = JSON.parse(cached);
        ITEMS = d.items; GENERATED_AT = d.generatedAt || "";
        BY_ID = {}; ITEMS.forEach((it) => (BY_ID[it.id] = it));
        return;
      }
    } catch (e) { /* cache unusable */ }
    const res = await fetch(CATALOG_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("catalog.json " + res.status);
    const data = await res.json();
    const rawItems = Array.isArray(data.items) ? data.items : [];
    ITEMS = rawItems.map(normalize).filter((it) => KINDS[it.kind]);
    GENERATED_AT = (data.marketplace && data.marketplace.generatedAt) || data.generatedAt || "";
    BY_ID = {};
    ITEMS.forEach((it) => (BY_ID[it.id] = it));
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items: ITEMS, generatedAt: GENERATED_AT }));
    } catch (e) { /* quota — fine */ }
  }

  /** Order items the way we recommend: featured first, then known release
   * recency, then name. Displayed numbers: none. */
  function recommendOrder(items) {
    return items.slice().sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      const ra = a.released || "", rb = b.released || "";
      if (ra !== rb) return rb.localeCompare(ra);
      return a.name.localeCompare(b.name);
    });
  }
  function azOrder(items) {
    return items.slice().sort((a, b) => a.name.localeCompare(b.name));
  }
  function newestOrder(items) {
    return items.slice().sort((a, b) => (b.released || "").localeCompare(a.released || "") || a.name.localeCompare(b.name));
  }
  const SORTS = { recommended: recommendOrder, az: azOrder, newest: newestOrder };

  function related(item, n) {
    const pool = ITEMS.filter((it) => it.id !== item.id && it.kind === item.kind);
    const sameCat = pool.filter((it) => it.category === item.category);
    const rest = pool.filter((it) => it.category !== item.category);
    return recommendOrder(sameCat).concat(recommendOrder(rest)).slice(0, n || 3);
  }

  /* --------------------------- install codes ------------------------------
   * Every add-on carries a short deterministic code (FCX-XXXXXX) derived
   * from its id — the same algorithm runs inside the app, so a code pasted
   * or typed into the in-app Marketplace resolves to this exact item.
   * Not secret, just a convenient handle. */

  const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function installCode(id) {
    let h = fnv1a(String(id || ""));
    let out = "";
    for (let i = 0; i < 6; i++) {
      out += CODE_ALPHABET[h % CODE_ALPHABET.length];
      h = Math.floor(h / CODE_ALPHABET.length) + (h >>> 16);
    }
    return "FCX-" + out;
  }

  /** Accepts: a code (FCX-XXXXXX / XXXXXX), a raw item id, an item.html or
   * fcx://install link, or any text containing one of those. */
  function resolveCode(text) {
    const raw = String(text || "").trim();
    if (!raw || !ITEMS.length) return null;
    let m = raw.match(/(?:id=|%22id%22[:% 3]+)([\w:-]+)/i);
    const fcx = raw.match(/fcx:\/\/install\?id=([\w:%-]+)/i);
    const candidateId = fcx ? decodeURIComponent(fcx[1]) : (m ? decodeURIComponent(m[1]) : null);
    if (candidateId && BY_ID[candidateId]) return BY_ID[candidateId];
    let norm = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (norm.startsWith("FCX")) norm = norm.slice(3);
    if (norm.length === 6) {
      const hit = ITEMS.find((it) => installCode(it.id) === "FCX-" + norm);
      if (hit) return hit;
    }
    // last resort: a bare id typed directly
    const bare = raw.replace(/^fcx:\/\/install\?id=/i, "");
    return BY_ID[bare] || null;
  }

  /* ------------------------- deep-link install ----------------------------
   * "Install in the app" buttons open fcx://install?id=… — on Android with
   * FocusCaseX installed the browser hands the link straight to the app,
   * which shows the confirmation dialog. If nothing opens (no app), a
   * fallback panel appears with the install code instead. */

  function deepLinkUrl(id) {
    return `fcx://install?id=${encodeURIComponent(id)}`;
  }

  let fallbackEl = null;

  function showAppFallback(it) {
    if (fallbackEl) return;
    fallbackEl = document.createElement("div");
    fallbackEl.className = "ov open";
    fallbackEl.setAttribute("role", "dialog");
    fallbackEl.innerHTML = `
<div class="ov-backdrop" data-fx-close></div>
<div class="ov-panel" style="max-width:440px;">
  <div style="padding:22px 22px 8px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="width:38px;height:38px;border-radius:10px;background:var(--blue-soft);color:var(--blue);display:flex;align-items:center;justify-content:center;">${icon("MonitorSmartphone", 19)}</span>
      <div><b style="font-family:var(--font-display);font-size:15.5px;">Open this in FocusCaseX</b>
      <div style="font-size:12px;color:var(--ink-3);">On the device that has the app installed</div></div>
    </div>
    <p style="margin-top:14px;font-size:13px;color:var(--ink-2);line-height:1.55;">
      The install button hands <b>${esc(it.name)}</b> to the FocusCaseX app on this device, where you confirm the install.
      If the app isn't on this device, type the code below in the app instead —
      <b>Settings → Marketplace → Install by code</b>.
    </p>
  </div>
  <div style="padding:10px 22px 6px;">
    <div class="code-row" style="margin-top:2px;">
      <span class="code-token">${esc(installCode(it.id))}</span>
      <button class="chip" type="button" data-copy="${esc(installCode(it.id))}">${icon("Copy", 13)}<span>Copy code</span></button>
    </div>
    <div style="display:flex;gap:9px;margin:14px 0 6px;">
      <a class="btn small primary" href="${esc(itemUrl(it.id))}">View item page</a>
      <button class="btn small" type="button" data-fx-close>Close</button>
    </div>
  </div>
</div>`;
    document.body.appendChild(fallbackEl);
    wireCopyButtons(fallbackEl);
    fallbackEl.querySelectorAll("[data-fx-close]").forEach((el) =>
      el.addEventListener("click", () => { fallbackEl.remove(); fallbackEl = null; }));
  }

  function openInApp(it) {
    if (!it) return;
    let switched = false;
    const onHide = () => { switched = true; };
    document.addEventListener("visibilitychange", onHide, { once: true });
    window.addEventListener("pagehide", onHide, { once: true });
    window.addEventListener("blur", onHide, { once: true });
    try { location.href = deepLinkUrl(it.id); } catch (e) { /* blocked — fallback covers it */ }
    setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("blur", onHide);
      if (!switched && !document.hidden) showAppFallback(it);
    }, 1900);
  }

  /** Wire [data-open-app="<item id>"] buttons and [data-code-form] boxes. */
  function wireDeepLinks(root) {
    (root || document).querySelectorAll("[data-open-app]").forEach((btn) => {
      if (btn.__fxDeep) return;
      btn.__fxDeep = true;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const it = BY_ID[btn.getAttribute("data-open-app")];
        if (it) openInApp(it);
      });
    });
    (root || document).querySelectorAll("[data-code-form]").forEach((form) => {
      if (form.__fxCode) return;
      form.__fxCode = true;
      const input = form.querySelector("[data-code-input]");
      const msg = form.parentElement.querySelector(".code-msg");
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const it = resolveCode(input ? input.value : "");
        if (it) {
          if (msg) { msg.classList.remove("err"); msg.textContent = "Opening " + it.name + "…"; }
          location.href = itemUrl(it.id);
        } else {
          if (msg) {
            msg.classList.add("err");
            msg.textContent = "No add-on matches that code — check the letters, or browse the catalog below.";
          } else {
            openSearch();
          }
        }
      });
    });
  }

  /* --------------------------- shared renderers --------------------------- */

  function tileStyle(kind) {
    const k = KINDS[kind] || {};
    return `--card-c:${k.c || "var(--blue)"};--card-soft:${k.soft || "var(--blue-soft)"};`;
  }

  function shield() {
    return `<span class="vshield" title="Reviewed and published by CaseX Labs">${icon("ShieldCheck", 13)}</span>`;
  }

  function metaRow(it) {
    const parts = [esc(it.author)];
    const upd = fmtDate(it.released);
    if (upd) parts.push(`Updated ${upd}`);
    return parts.join('<span class="dot"></span>');
  }

  function cardHtml(it, opts) {
    opts = opts || {};
    const copyBtn = opts.copyEmbed && it.kind === "capsule"
      ? `<button class="card-copy" data-copy-embed="${esc(it.meta.capsuleId || it.id)}" title="Copy embed block" aria-label="Copy embed block">${icon("Copy", 14)}</button>`
      : "";
    return `
<a class="card" style="${tileStyle(it.kind)}" href="${itemUrl(it.id)}">
  ${copyBtn}
  <span class="tile">${icon(it.icon, 17)}</span>
  <span class="card-name">${esc(it.name)}${it.verified ? shield() : ""}</span>
  <span class="card-desc">${esc(cleanCopy(it.tagline || it.description || ""))}</span>
  <span class="swatches hidden" data-swatches="${esc(it.id)}"></span>
  <span class="card-meta">${metaRow(it)}</span>
</a>`;
  }

  /** Render a grid with the 12-cap + "Show all N" expander.
   * Returns html; caller must then call FCX.wireGrid(container). */
  function renderGrid(items, opts) {
    opts = opts || {};
    const cap = opts.cap || 12;
    const shown = items.slice(0, cap);
    let html = `<div class="grid">`;
    html += shown.map((it) => cardHtml(it, opts)).join("");
    html += `</div>`;
    if (items.length > cap) {
      html += `<div class="grid-foot"><button class="show-all" data-show-all="1">Show all ${items.length}</button></div>`;
      html += `<div class="grid hidden" data-rest-grid>${items.slice(cap).map((it) => cardHtml(it, opts)).join("")}</div>`;
    }
    return html;
  }

  function wireGrid(root) {
    root.querySelectorAll("[data-show-all]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rest = root.querySelector("[data-rest-grid]");
        if (rest) rest.classList.remove("hidden");
        btn.parentElement.classList.add("hidden");
      });
    });
    wireCopyButtons(root);
    hydrateSwatches(root);
  }

  /** Wire every [data-copy] element: copies its data-copy value. */
  function wireCopyButtons(root) {
    root.querySelectorAll("[data-copy]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const text = el.getAttribute("data-copy") || "";
        copyText(text).then(() => {
          el.classList.add("done");
          const old = el.innerHTML;
          el.innerHTML = `${icon("Check", 13)} Copied`;
          setTimeout(() => { el.innerHTML = old; el.classList.remove("done"); }, 1400);
        });
      });
    });
    root.querySelectorAll("[data-copy-embed]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const id = el.getAttribute("data-copy-embed");
        copyText(embedFence(id)).then(() => {
          const old = el.innerHTML;
          el.innerHTML = icon("Check", 14);
          setTimeout(() => (el.innerHTML = old), 1400);
        });
      });
    });
  }

  /* ------------------------- theme swatch helpers ------------------------- */

  const DEFAULT_DARK_VARS = {
    bg: "#14181C", bgPanel: "#1B2126", text: "#E9E6E0",
    accent: "#3FA796", border: "#2A3138", muted: "#8B95A0",
  };
  const varsCache = {};

  async function fetchThemeVars(themeItem) {
    const id = themeItem.meta.themeId || themeItem.id.replace("theme:", "");
    if (varsCache[id]) return varsCache[id];
    let vars = null;
    try {
      const res = await fetch(`themes/${id}.json`, { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.vars && Object.keys(data.vars).length) vars = data.vars;
      }
    } catch (e) { /* offline file — fall through */ }
    if (!vars) vars = Object.assign({}, DEFAULT_DARK_VARS);
    varsCache[id] = vars;
    return vars;
  }

  function swatchKeys(vars) {
    const keys = ["bg", "bgPanel", "text", "accent", "border"];
    return keys.filter((k) => vars[k]);
  }

  function swatchesHtml(vars) {
    const keys = swatchKeys(vars);
    return `<span class="swatches">${keys
      .map((k, i) => `<span class="sw${i === 0 ? " ring" : ""}" style="background:${esc(vars[k])}" title="${k}"></span>`)
      .join("")}</span>`;
  }

  /** Attach swatch strips to placeholder spans ([data-swatches="theme:id"]). */
  async function hydrateSwatches(root) {
    const spots = root.querySelectorAll("[data-swatches]");
    if (!spots.length) return;
    for (const spot of spots) {
      const ref = spot.getAttribute("data-swatches") || "";
      if (!ref.startsWith("theme:")) continue;
      const id = ref.slice(6);
      const it = BY_ID["theme:" + id];
      if (!it) continue;
      const vars = await fetchThemeVars(it);
      spot.outerHTML = swatchesHtml(vars);
    }
  }

  /** The big theme preview: a mini workspace chrome painted with the
   * theme's real variables. */
  function themePreviewHtml(vars) {
    const v = vars;
    const ink = v.text || "#111";
    const soft = (c, a) => c + Math.round(a * 255).toString(16).padStart(2, "0");
    const panel = v.bgSidebar || v.bgPanel || v.bg || "#eee";
    const chips = v.accent && v.accentForeground
      ? `background:${esc(v.accent)};color:${esc(v.accentForeground)};`
      : `background:${esc(v.accent || "#888")};color:${esc(v.bg || "#fff")};`;
    return `
<div class="theme-preview" style="background:${esc(v.bg || "#fff")};">
  <div class="tp-bar" style="border-bottom:1px solid ${esc(v.border || "#ddd")};">
    <span class="tp-dotrow">
      <span style="background:${soft(ink, .28)}"></span>
      <span style="background:${soft(ink, .18)}"></span>
      <span style="background:${soft(ink, .10)}"></span>
    </span>
    <span style="flex:1"></span>
    <span style="width:84px;height:9px;border-radius:5px;background:${soft(ink, .10)}"></span>
  </div>
  <div class="tp-body">
    <div class="tp-side" style="background:${esc(panel)};border-right:1px solid ${esc(v.border || "#ddd")};">
      <i style="background:${esc(v.accent || "#888")};opacity:.9;"></i>
      <i style="background:${soft(ink, .16)};width:85%"></i>
      <i style="background:${soft(ink, .12)};width:70%"></i>
      <i style="background:${soft(ink, .12)};width:78%"></i>
      <i style="background:${soft(ink, .08)};width:55%"></i>
    </div>
    <div class="tp-page">
      <h4 style="color:${esc(ink)};">Refraction note</h4>
      <i style="background:${soft(ink, .14)};width:82%"></i>
      <i style="background:${soft(ink, .10)};width:64%"></i>
      <i style="background:${soft(ink, .10)};width:74%"></i>
      <div class="tp-chiprow">
        <span style="${chips}">6/6</span>
        <span style="background:${soft(ink, .10)};color:${esc(ink)};">IOP 16</span>
        <span style="background:${soft(ink, .08)};color:${esc(ink)};">Δ notes</span>
      </div>
    </div>
  </div>
</div>`;
  }

  /* -------------------------- capsule demo boards --------------------------
   * One live sample board per capsule family, so a visitor sees the real
   * layout before installing. Static sample data, clearly captioned. */

  function demoTag(bg, fg, t) {
    return `<span class="db-tag" style="background:${bg};color:${fg};">${t}</span>`;
  }

  function demoBoardHtml(caption) {
    return `
<div class="demo-board">
  <div class="db-stats">
    <span class="db-stat"><b>32</b><span>Today</span></span>
    <span class="db-stat"><b>21</b><span>Done</span></span>
    <span class="db-stat"><b>₹18,400</b><span>Collected</span></span>
    <span class="db-stat"><b>3</b><span>Unpaid</span></span>
  </div>
  <div class="db-row"><span class="db-time">9:00</span><span class="db-name">Arun Kumar</span>${demoTag("var(--k-capsule-soft)", "var(--k-capsule)", "Done")}</div>
  <div class="db-row"><span class="db-time">9:30</span><span class="db-name">Meera Joseph</span>${demoTag("var(--k-extension-soft)", "var(--k-extension)", "In exam")}</div>
  <div class="db-row"><span class="db-time">10:00</span><span class="db-name">Rahim Shaikh</span>${demoTag("var(--k-template-soft)", "var(--k-template)", "Optics")}</div>
  <div class="db-row"><span class="db-time">10:30</span><span class="db-name">Divya Nair</span>${demoTag("var(--k-theme-soft)", "var(--k-theme)", "Billing")}</div>
  <div class="db-caption">${esc(caption || "Sample data — the real board reads your own appointments.")}</div>
</div>`;
  }

  function demoStatsHtml(caption) {
    return `
<div class="demo-board">
  <div class="db-stats">
    <span class="db-stat"><b>214</b><span>Patients</span></span>
    <span class="db-stat"><b>32</b><span>Visits today</span></span>
    <span class="db-stat"><b>₹48,200</b><span>Month billing</span></span>
    <span class="db-stat"><b>91%</b><span>Recalls booked</span></span>
  </div>
  <div class="db-row"><span class="db-time">KPI</span><span class="db-name">New patients · this month</span><span class="db-tag" style="background:var(--blue-soft);color:var(--blue);">+38</span></div>
  <div class="db-row"><span class="db-time">KPI</span><span class="db-name">Follow-ups due this week</span><span class="db-tag" style="background:var(--k-capsule-soft);color:var(--k-capsule);">27</span></div>
  <div class="db-row"><span class="db-time">KPI</span><span class="db-name">Optics conversion</span><span class="db-tag" style="background:var(--k-template-soft);color:var(--k-template);">62%</span></div>
  <div class="db-caption">${esc(caption || "Sample data — the real page computes these from your EMR.")}</div>
</div>`;
  }

  function demoQueueHtml(caption, title) {
    return `
<div class="demo-board">
  <div class="db-stats">
    <span class="db-stat"><b>${title || "12"}</b><span>${(caption || "").indexOf("recall") > -1 ? "Overdue" : "To bill"}</span></span>
    <span class="db-stat"><b>5</b><span>${(caption || "").indexOf("recall") > -1 ? "Booked today" : "Dispensing"}</span></span>
    <span class="db-stat"><b>₹9,850</b><span>Collected today</span></span>
  </div>
  <div class="db-row"><span class="db-time">MR-104</span><span class="db-name">Arun Kumar</span>${demoTag("var(--k-capsule-soft)", "var(--k-capsule)", "Paid · UPI")}</div>
  <div class="db-row"><span class="db-time">MR-129</span><span class="db-name">Meera Joseph</span>${demoTag("var(--k-theme-soft)", "var(--k-theme)", "Cash due")}</div>
  <div class="db-row"><span class="db-time">MR-133</span><span class="db-name">Rahim Shaikh</span>${demoTag("var(--k-extension-soft)", "var(--k-extension)", "Card")}</div>
  <div class="db-caption">${esc(caption || "Sample data — the real queue reads your billing table.")}</div>
</div>`;
  }

  /** Pick the right live sample for a capsule id.
   *  v5: full per-capsule demos live in assets/demos.js (FCX_CAPSULE_DEMOS,
   *  keyed by capsule id); this falls back by family when that file is not
   *  loaded or a capsule has no bespoke demo yet. */
  function demoForCapsule(capsuleId) {
    const id = String(capsuleId || "").replace(/^capsule:/, "");
    const custom = window.FCX_CAPSULE_DEMOS && window.FCX_CAPSULE_DEMOS[id];
    if (custom) return custom;
    if (id === "ui-clinic" || id === "ui-stats") return demoStatsHtml();
    if (id === "ui-billing") return demoQueueHtml("Sample data — the real queue reads your billing table.");
    if (id === "ui-recalls") return demoQueueHtml("Sample data — the real recall board reads visit advice.", "9");
    return demoBoardHtml();
  }

  /* ------------------------- extension live previews ---------------------- */

  /** Extensions do different jobs — a tagline mock cannot show that. v5
   *  keeps a per-extension functional preview in assets/demos.js
   *  (FCX_EXT_DEMOS, keyed by item id, e.g. "plugin:optomize"). This is the
   *  honest generic fallback: what appears in your workspace, plainly. */
  function extensionPreviewHtml(it) {
    const custom = window.FCX_EXT_DEMOS && window.FCX_EXT_DEMOS[it.id];
    if (custom) return custom(it);
    const name = esc(cleanCopy(it.name));
    const rows = [
      { ic: "Zap", n: name + " action", v: "toolbar" },
      { ic: "FileText", n: "Writes into your pages", v: "markdown" },
      { ic: "ShieldCheck", n: "Runs on-device", v: "offline" },
    ];
    return `
<div class="ext-preview">
  <div class="ext-toolbar">
    <span class="et-btn">${icon(it.icon || "Puzzle", 13)}${name}</span>
    <span class="et-quiet">appears in your toolbar after install</span>
  </div>
  ${rows.map((r) => `<div class="ext-line"><span class="el-ic">${icon(r.ic, 14)}</span><span class="el-name">${r.n}</span><span class="el-val">${r.v}</span></div>`).join("")}
  <div class="ext-panel">${icon("Info", 13)}<span>Sample mock-up — the real surface renders inside your workspace with your data.</span></div>
</div>`;
  }

  /* --------------------------- markdown mini renderer --------------------- */

  function renderMd(src) {
    const lines = String(src || "").replace(/\r/g, "").split("\n");
    let out = "", para = [], list = null;
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[\[([^\]|]+)\]\]/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
    const flushP = () => { if (para.length) { out += `<p>${para.map(inline).join("<br>")}</p>`; para = []; } };
    const flushL = () => { if (list) { out += `<${list}>${listBuf.join("")}</${list}>`; list = null; listBuf = []; } };
    let listBuf = [];
    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const t = line.trim();
      if (/^```/.test(t)) { flushP(); flushL(); continue; }
      if (!t) { flushP(); flushL(); continue; }
      let m;
      if ((m = t.match(/^(#{1,4})\s+(.*)$/))) { flushP(); flushL(); out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; continue; }
      if (/^(-{3,}|\*{3,})$/.test(t)) { flushP(); flushL(); out += "<hr>"; continue; }
      if ((m = t.match(/^>\s?(.*)$/))) { flushP(); flushL(); out += `<blockquote>${inline(m[1])}</blockquote>`; continue; }
      if ((m = t.match(/^[-*]\s+(.*)$/))) { flushP(); if (list !== "ul") { flushL(); list = "ul"; } listBuf.push(`<li>${inline(m[1])}</li>`); continue; }
      if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { flushP(); if (list !== "ol") { flushL(); list = "ol"; } listBuf.push(`<li>${inline(m[1])}</li>`); continue; }
      if (t.startsWith("|") && t.endsWith("|")) {
        flushP(); flushL();
        const cells = t.slice(1, -1).split("|").map((c) => c.trim());
        if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
        out += `<table><tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr></table>`;
        continue;
      }
      flushL();
      para.push(t);
    }
    flushP(); flushL();
    return out;
  }

  async function fetchTemplateBody(templateItem) {
    const path = templateItem.files && templateItem.files.body;
    if (!path) return "";
    try {
      const res = await fetch(path, { cache: "no-cache" });
      if (!res.ok) return "";
      return await res.text();
    } catch (e) { return ""; }
  }

  /* ------------------------------ install copy ---------------------------- */

  function installSteps(it) {
    const k = KINDS[it.kind];
    const steps = [
      `Open <strong>FocusCaseX</strong> → <strong>Settings</strong> → <strong>Marketplace</strong>.`,
      `Search for <strong>${esc(it.name)}</strong>${k ? ` under <strong>${esc(k.label)}</strong>` : ""}.`,
      `Tap <strong>Install</strong> — it appears in your workspace right away.`,
    ];
    return `<div class="install">
  <h3>${icon("Download", 16)} Install in FocusCaseX</h3>
  <ol class="steps">${steps.map((s) => `<li><span>${s}</span></li>`).join("")}</ol>
  <div class="after">Free · works offline after install · remove any time under Settings.</div>
</div>`;
  }

  /** The full install card used on item pages: deep-link button, install
   * code, in-app steps. Wire with FCX.wireDeepLinks(container). */
  function installCardHtml(it) {
    const code = installCode(it.id);
    return `
<div class="install">
  <h3>${icon("Download", 16)} Install in FocusCaseX</h3>
  <div style="margin-top:14px;">
    <button class="btn primary" type="button" data-open-app="${esc(it.id)}" style="width:100%;">
      ${icon("MonitorSmartphone", 16)}<span>Install — open the app</span>
    </button>
    <div class="preview-note" style="margin-top:9px;">${icon("Info", 13)}<span>Opens FocusCaseX on this device and asks you to confirm the install there.</span></div>
  </div>
  <div class="code-row">
    <span class="code-token" title="Install code — type this inside the app">${esc(code)}</span>
    <button class="chip" type="button" data-copy="${esc(code)}">${icon("Copy", 13)}<span>Copy code</span></button>
  </div>
  <ol class="steps" style="margin-top:16px;">
    <li><span>Open <strong>FocusCaseX</strong> → <strong>Settings</strong> → <strong>Marketplace</strong>.</span></li>
    <li><span>Search for <strong>${esc(it.name)}</strong> — or type the code above under <strong>Install by code</strong>.</span></li>
    <li><span>Tap <strong>Install</strong> — it appears in your workspace right away.</span></li>
  </ol>
  <div class="after">Free · works offline after install · remove any time under Settings.</div>
</div>`;
  }

  /* ------------------------------ URL helpers ----------------------------- */

  function itemUrl(id) {
    return `/marketplace/item/?id=${encodeURIComponent(id)}`;
  }
  function embedFence(capsuleId) {
    const id = String(capsuleId || "").replace(/^capsule:/, "");
    return `\`\`\`mdui\ncapsule: ${id}\n\`\`\``;
  }

  /* ------------------------------ chrome ---------------------------------- */

  function injectChrome(activeSection) {
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    const onMarket = activeSection === "marketplace" || KINDS[activeSection];
    const brand = `<a class="brand" href="/">${icon("Stethoscope", 20)}<span>FocusCaseX${onMarket ? ` <span class="brand-market">Marketplace</span>` : ""}</span></a>`;
    if (header) {
      const navLink = (href, label, id) =>
        `<a href="${href}" class="${activeSection === id ? "on" : ""}">${label}</a>`;
      const nav =
        navLink("/", "Overview", "home") +
        navLink("/marketplace/", "Marketplace", "marketplace") +
        navLink("/pricing/", "Pricing", "pricing") +
        navLink("/docs/", "Docs", "docs") +
        navLink("/updates/", "Updates", "updates");
      header.innerHTML = `
<div class="top"><div class="top-inner">
  ${brand}
  <nav class="nav">${nav}</nav>
  <div class="top-actions">
    <button class="search-btn" id="topbar-search" type="button" aria-label="Search the catalog">${icon("Search", 14)}<span class="top-label">Search</span><kbd>/</kbd></button>
    <a class="btn small primary" href="/install/" id="topbar-install">${icon("Download", 14)}<span class="top-label">Install guide</span></a>
  </div>
</div></div>`;
      header.querySelector("#topbar-search").addEventListener("click", openSearch);
    }
    if (footer) {
      const count = ITEMS.length;
      const when = fmtDate(GENERATED_AT) || "recently";
      footer.innerHTML = `
<div class="foot"><div class="wrap foot-inner">
  <div>
    <div class="foot-brand">${icon("Stethoscope", 17)} FocusCaseX</div>
    <div class="foot-status">Catalog updated ${esc(when)} · ${count} add-ons · maintained by CaseX Labs</div>
  </div>
  <div class="foot-links">
    <a href="/">Overview</a>
    <a href="/marketplace/">Marketplace</a>
    <a href="/pricing/">Pricing</a>
    <a href="/docs/">Docs</a>
    <a href="/updates/">Updates</a>
    <a href="/install/">Install guide</a>
    <a href="/api/">For developers</a>
    <a href="https://github.com/stromplayz/FocusCaseX" target="_blank" rel="noopener">GitHub</a>
    <a href="${APP_LINK}" target="_blank" rel="noopener">FocusCaseX app</a>
  </div>
</div></div>`;
    }
  }

  /* ------------------------------ search overlay -------------------------- */

  let ovEl = null, searchSel = 0, searchResults = [];

  function scoreItem(it, q) {
    const name = it.name.toLowerCase();
    const n = name.indexOf(q);
    if (n === 0) return 100;
    if (n > 0) return 70;
    if (it.tags.some((t) => t.toLowerCase().startsWith(q))) return 55;
    if ((it.category || "").toLowerCase().startsWith(q)) return 50;
    if (it.tagline.toLowerCase().includes(q)) return 30;
    if (it.description.toLowerCase().includes(q)) return 20;
    if (it.tags.some((t) => t.toLowerCase().includes(q))) return 15;
    return -1;
  }

  function searchItems(q) {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const scored = ITEMS.map((it) => ({ it, s: scoreItem(it, query) })).filter((r) => r.s >= 0);
    scored.sort((a, b) => b.s - a.s || a.it.name.localeCompare(b.it.name));
    return scored.map((r) => r.it);
  }

  function resultHtml(it) {
    const k = KINDS[it.kind];
    return `
<button class="result" data-id="${esc(it.id)}" type="button">
  <span class="tile" style="${tileStyle(it.kind)}">${icon(it.icon, 14)}</span>
  <span style="min-width:0">
    <span class="r-name" style="display:block">${esc(it.name)}</span>
    <span class="r-tag" style="display:block">${esc(cleanCopy(it.tagline) || k.one)}</span>
  </span>
</button>`;
  }

  function renderSearchList(q) {
    const listEl = ovEl.querySelector(".search-results");
    const query = q.trim().toLowerCase();
    if (!query) {
      listEl.innerHTML = `<div class="search-empty">Start typing to search ${ITEMS.length} add-ons — or jump straight in:
        <div class="tasks">
          <a class="task" href="/marketplace/capsules/">Track my appointments ${icon("ArrowRight", 14)}</a>
          <a class="task" href="/marketplace/templates/">Write notes faster ${icon("ArrowRight", 14)}</a>
          <a class="task" href="/marketplace/themes/">Change the look ${icon("ArrowRight", 14)}</a>
        </div></div>`;
      searchResults = [];
      return;
    }
    const hits = searchItems(query);
    searchResults = hits;
    searchSel = 0;
    if (!hits.length) {
      // a code typed into search should still resolve
      const byCode = resolveCode(q);
      if (byCode) { location.href = itemUrl(byCode.id); return; }
      listEl.innerHTML = `<div class="search-empty">No add-on matches that. Try a shorter word — or browse a category below.
        <div class="tasks">
          <a class="task" href="/marketplace/extensions/">Extensions ${icon("ArrowRight", 14)}</a>
          <a class="task" href="/marketplace/capsules/">Capsules ${icon("ArrowRight", 14)}</a>
          <a class="task" href="/marketplace/themes/">Themes ${icon("ArrowRight", 14)}</a>
          <a class="task" href="/marketplace/templates/">Templates ${icon("ArrowRight", 14)}</a>
        </div></div>`;
      return;
    }
    const byKind = {};
    hits.forEach((h) => { (byKind[h.kind] = byKind[h.kind] || []).push(h); });
    let html = "", flat = [];
    for (const k of KIND_ORDER) {
      const group = byKind[k];
      if (!group) continue;
      html += `<div class="group-label">${esc(KINDS[k].label)} · ${group.length}</div>`;
      html += group.slice(0, 4).map((it) => resultHtml(it)).join("");
      group.slice(0, 4).forEach((it) => flat.push(it));
    }
    listEl.innerHTML = html;
    highlightSel();
  }

  function highlightSel() {
    if (!ovEl) return;
    const results = ovEl.querySelectorAll(".result");
    results.forEach((el, i) => el.classList.toggle("sel", i === searchSel));
    const sel = results[searchSel];
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  function openSearch() {
    if (!ovEl) buildOverlay();
    ovEl.classList.add("open");
    const input = ovEl.querySelector("input");
    input.value = "";
    renderSearchList("");
    setTimeout(() => input.focus(), 30);
  }
  function closeSearch() {
    if (ovEl) ovEl.classList.remove("open");
  }

  function buildOverlay() {
    ovEl = document.createElement("div");
    ovEl.className = "ov";
    ovEl.innerHTML = `
<div class="ov-backdrop"></div>
<div class="ov-panel" role="dialog" aria-label="Search the marketplace">
  <div class="search-input">${icon("Search", 17)}<input type="text" placeholder='Search — try "refraction" or "appointments"' aria-label="Search the marketplace"><span class="esc">esc</span></div>
  <div class="search-results"></div>
</div>`;
    document.body.appendChild(ovEl);
    ovEl.querySelector(".ov-backdrop").addEventListener("click", closeSearch);
    const input = ovEl.querySelector("input");
    input.addEventListener("input", () => renderSearchList(input.value));
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowDown") { ev.preventDefault(); searchSel = Math.min(searchSel + 1, Math.max(0, searchResults.length - 1)); highlightSel(); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); searchSel = Math.max(0, searchSel - 1); highlightSel(); }
      else if (ev.key === "Enter") {
        ev.preventDefault();
        const sel = ovEl.querySelectorAll(".result")[searchSel];
        const id = sel ? sel.getAttribute("data-id") : (searchResults[0] && searchResults[0].id);
        if (id) location.href = itemUrl(id);
      }
    });
    ovEl.querySelector(".search-results").addEventListener("click", (ev) => {
      const btn = ev.target.closest(".result");
      if (btn) location.href = itemUrl(btn.getAttribute("data-id"));
    });
    document.addEventListener("keydown", (ev) => {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement && document.activeElement.isContentEditable);
      if ((ev.key === "/" && !typing) || ((ev.key === "k" || ev.key === "K") && (ev.metaKey || ev.ctrlKey))) {
        ev.preventDefault(); openSearch();
      } else if (ev.key === "Escape") closeSearch();
    });
  }

  /* -------------------------------- tabs ---------------------------------- */

  /** tabs: [{id,label,count}], active: id; onChange(id). Renders into el. */
  function renderTabs(el, tabs, active, onChange) {
    el.innerHTML = tabs
      .map((t) => `<button class="tab ${t.id === active ? "on" : ""}" data-tab="${esc(t.id)}" type="button">${esc(t.label)}${typeof t.count === "number" ? `<span class="count">${t.count}</span>` : ""}</button>`)
      .join("");
    el.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-tab");
        el.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b === btn));
        onChange(id);
      });
    });
  }

  /* ------------------------------ boot ----------------------------------- */

  async function ready(opts) {
    opts = opts || {};
    await loadCatalog();
    injectChrome(opts.active || null);
    if (opts.search !== false) buildOverlay();
    wireCopyButtons(document);
    wireDeepLinks(document);
    return FCX;
  }

  const FCX = {
    ready, icon, esc, fmtDate, copyText, cleanCopy,
    get items() { return ITEMS; },
    byId: (id) => BY_ID[id] || null,
    KINDS, KIND_ORDER,
    recommendOrder, azOrder, newestOrder, SORTS,
    related, itemUrl, embedFence, APP_LINK,
    cardHtml, renderGrid, wireGrid, wireCopyButtons, hydrateSwatches, metaRow, tileStyle,
    renderTabs, getParam, setParam,
    fetchThemeVars, swatchesHtml, themePreviewHtml,
    demoBoardHtml, demoStatsHtml, demoQueueHtml, demoForCapsule,
    extensionPreviewHtml, renderMd, fetchTemplateBody,
    installSteps, installCardHtml,
    installCode, resolveCode, deepLinkUrl, openInApp, wireDeepLinks, showAppFallback,
    openSearch, closeSearch,
    version: 5,
  };
  window.FCX = FCX;
})();
